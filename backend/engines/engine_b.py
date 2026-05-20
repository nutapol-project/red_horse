# ============================================================
# engines/engine_b.py
# Engine B: Graph Neural Network — Fraud Community Detection
#
# In production this wraps a trained PyTorch Geometric (PyG)
# GraphSAGE / GAT model.  Here we simulate the graph topology
# score using NetworkX community analysis + Sklearn isolation
# forest so the system runs without a GPU.
# ============================================================

from __future__ import annotations
import hashlib
import numpy as np
import networkx as nx
from dataclasses import dataclass
from sklearn.ensemble import IsolationForest


# ─── Known fraudulent clusters (mock — loaded from DB in production) ──────────
# Represents pre-identified fraud subgraphs stored in Neo4j
KNOWN_FRAUD_IMEIS = {
    "IMEI_FRAUD_001", "IMEI_FRAUD_002", "IMEI_FRAUD_003",
    "IMEI_FRAUD_004", "IMEI_FRAUD_005",
}
KNOWN_FRAUD_IPS = {
    "10.0.0.1", "192.168.100.1", "172.16.0.99",
}

CLUSTER_FLAG_THRESHOLD = 0.60


@dataclass
class EngineBOutput:
    graph_node_count:  int
    graph_edge_count:  int
    cluster_fraud_score: float    # 0.0–1.0 similarity to known fraud clusters
    cluster_flagged:   bool
    normalized_score:  float      # same scale as Engine A output


def _hash_identifier(value: str) -> str:
    """Consistent one-way hash so raw IMEIs/IPs never touch the graph layer."""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def _build_heterogeneous_graph(
    user_id:            str,
    device_imei:        str,
    ip_address:         str,
    connected_user_ids: list[str],
) -> nx.DiGraph:
    """
    Constructs a directed heterogeneous graph matching SRS §2, Metric 4:

    Nodes:  User, Device, IP
    Edges:  User -[USED_DEVICE]-> Device
            User -[CONNECTED_FROM]-> IP
            User -[SHARES_NETWORK_WITH]-> OtherUser  (if same device/IP)

    In production, this graph is persisted in Neo4j and the
    embeddings are computed via PyG GraphSAGE/GAT.
    """
    G = nx.DiGraph()

    # ── Add central user node ──────────────────────────────────────────────
    G.add_node(user_id,             node_type="User")
    G.add_node(_hash_identifier(device_imei), node_type="Device")
    G.add_node(_hash_identifier(ip_address),  node_type="IP")

    # ── Add edges ──────────────────────────────────────────────────────────
    G.add_edge(user_id,
               _hash_identifier(device_imei), relation="USED_DEVICE")
    G.add_edge(user_id,
               _hash_identifier(ip_address),  relation="CONNECTED_FROM")

    # ── Connect to shared-device/IP neighbors (fraud ring topology) ───────
    for neighbor_id in connected_user_ids:
        G.add_node(neighbor_id, node_type="User")
        G.add_edge(neighbor_id,
                   _hash_identifier(device_imei), relation="USED_DEVICE")
        G.add_edge(user_id, neighbor_id,           relation="SHARES_NETWORK_WITH")

    return G


def _compute_topology_fraud_score(
    G:           nx.DiGraph,
    user_id:     str,
    device_imei: str,
    ip_address:  str,
) -> float:
    """
    Simulates the GNN node embedding fraud probability via three signals:

    Signal 1 — Direct hit against known fraud device/IP blacklists.
    Signal 2 — Graph centrality: high betweenness → hub of a fraud ring.
    Signal 3 — Isolation Forest anomaly score on node feature vector.

    Returns an aggregated fraud probability ∈ [0.0, 1.0].
    """

    # ── Signal 1: Blacklist match (hard evidence) ──────────────────────────
    blacklist_score = 0.0
    if device_imei in KNOWN_FRAUD_IMEIS:
        blacklist_score += 0.55
    if ip_address in KNOWN_FRAUD_IPS:
        blacklist_score += 0.45
    blacklist_score = min(blacklist_score, 1.0)

    # ── Signal 2: Graph centrality (structural role in fraud ring) ─────────
    # High betweenness centrality = node connects many sub-communities = mule
    try:
        centrality = nx.betweenness_centrality(G, normalized=True)
        user_centrality = centrality.get(user_id, 0.0)
    except Exception:
        user_centrality = 0.0

    # Normalize: centrality > 0.3 is suspicious in a small fraud graph
    centrality_score = min(user_centrality / 0.3, 1.0)

    # ── Signal 3: Isolation Forest on node feature vector ─────────────────
    # Features: [degree, in_degree, out_degree, neighbor_count]
    degree      = G.degree(user_id)
    in_degree   = G.in_degree(user_id)
    out_degree  = G.out_degree(user_id)
    neighbors   = len(list(nx.neighbors(G, user_id)))

    # We need a reference "normal" population for IsolationForest
    # In production this is the historical node feature matrix from Neo4j
    rng = np.random.default_rng(seed=42)
    normal_population = rng.integers(low=[1, 0, 1, 1],
                                     high=[3, 2, 2, 3],
                                     size=(200, 4)).astype(float)
    user_features = np.array([[degree, in_degree, out_degree, neighbors]],
                              dtype=float)

    iso_forest = IsolationForest(n_estimators=100, contamination=0.05,
                                 random_state=42)
    iso_forest.fit(normal_population)

    # score_samples returns negative; more negative = more anomalous
    raw_iso_score   = iso_forest.score_samples(user_features)[0]
    # Normalize to [0, 1] — typical range is [-0.7, 0.1]
    isolation_score = float(np.clip((raw_iso_score + 0.7) / 0.8, 0.0, 1.0))
    isolation_score = 1.0 - isolation_score   # Invert: anomalous → high score

    # ── Weighted combination of all three signals ──────────────────────────
    combined = (
        0.50 * blacklist_score
        + 0.30 * centrality_score
        + 0.20 * isolation_score
    )
    return round(min(combined, 1.0), 4)


def run_engine_b(
    user_id:            str,
    device_imei:        str,
    ip_address:         str,
    connected_user_ids: list[str],
) -> EngineBOutput:
    """
    Main entry point for Engine B.
    Builds the heterogeneous graph, computes fraud cluster score,
    and returns a structured EngineBOutput.
    """
    G = _build_heterogeneous_graph(
        user_id=user_id,
        device_imei=device_imei,
        ip_address=ip_address,
        connected_user_ids=connected_user_ids,
    )

    fraud_score = _compute_topology_fraud_score(
        G=G,
        user_id=user_id,
        device_imei=device_imei,
        ip_address=ip_address,
    )

    return EngineBOutput(
        graph_node_count   = G.number_of_nodes(),
        graph_edge_count   = G.number_of_edges(),
        cluster_fraud_score= fraud_score,
        cluster_flagged    = fraud_score >= CLUSTER_FLAG_THRESHOLD,
        normalized_score   = fraud_score,
    )
