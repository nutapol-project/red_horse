# AI Tool Usage Documentation

## Tool Used
- **AI Assistant:** Claude (Anthropic)
- **Platform:** ai.kmitl.ac.th (kAI by KMITL)
- **Model:** Claude 3.5 Sonnet

---

## Usage Summary

### Backend Development
| File | AI Contribution |
|------|----------------|
| `engine_a.py` | Generated Keystroke σ², Bayesian inference chain, Benford TVD formulas |
| `engine_b.py` | Generated GNN graph topology, Isolation Forest integration |
| `schemas.py` | Generated Pydantic request/response models |
| `policy.py` | Generated threshold enforcement logic |
| `main.py` | Generated FastAPI endpoints and CORS middleware |
| `simulator.py` | Generated pandas batch simulation pipeline |

### Frontend Development
| File | AI Contribution |
|------|----------------|
| `App.jsx` | Generated 8-tab dashboard with all chart components |
| `AssessForm.jsx` | Generated form modules, preset system, toggle inputs |
| `api.js` | Generated FastAPI fetch client |

### Documentation
| File | AI Contribution |
|------|----------------|
| `README.md` | Generated full setup instructions in English |
| `AI_USAGE.md` | This file |

---

## Prompt Examples

### Backend Engine Generation
> "Generate Engine A for Red Horse Project implementing:
> Keystroke variance σ² = (1/N)Σ(tᵢ−μ)²,
> Sequential Bayesian updating P(Mule|Behavior),
> Benford's Law TVD deviation scoring"

### Frontend Dashboard Generation
> "Generate a React dashboard with 8 tabs:
> Overview, Engine A, Engine B, Fusion, 3 Cases,
> Simulate, Audit Log, Assess using Recharts and Tailwind CSS"

### Bug Fix Assistance
> "Score gauge shows green for MEDIUM risk (41%)
> but should show yellow — threshold mismatch with policy engine"

---

## Co-authorship Declaration

All code in this repository was developed with AI assistance.
Human developer: reviewed, integrated, tested, and deployed all AI-generated code.

Co-authored-by: Claude (Anthropic) <claude@anthropic.com>
AI-Tool: Claude 3.5 Sonnet via ai.kmitl.ac.th
