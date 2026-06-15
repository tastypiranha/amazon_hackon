# amazon_hackon.
<div align="center">

# ♻️ Amazon ReLife
**The Circular Economy Layer for E-Commerce. Built for HackOn with Amazon.**

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-%23EE4C2C.svg?style=for-the-badge&logo=PyTorch&logoColor=white)](https://pytorch.org/)
[![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

*Turning reverse logistics from a net-negative operational cost into a sustainable, community-driven ecosystem.*

</div>

---

## 📑 Table of Contents
- [📌 Problem Statement](#-problem-statement)
- [🚀 Our Solution](#-our-solution)
- [🛠️ Tech Stack](#️-tech-stack)
- [⚙️ Local Setup & Installation](#️-local-setup--installation)
- [🧠 Core Algorithms](#-core-algorithms)

---

## 📌 Problem Statement

> The modern e-commerce lifecycle is strictly linear: **buy, use, and discard.**

Millions of tons of e-waste are generated annually, and retailers face astronomical costs in reverse logistics (returns). Currently, there is no frictionless, integrated ecosystem that seamlessly connects returns, peer-to-peer exchanges, and incentivized donations directly within the primary shopping experience.

---

## 🚀 Our Solution

Amazon ReLife intercepts the traditional "discard" phase and reroutes products into a circular economy. We achieve this through six core pillars:

*   🤖 **AI Image Classification:** Computer vision (HuggingFace CLIP) for automated, objective grading of user products.
*   📉 **Return Prediction:** Preemptively identifying high-risk returns using AI to reduce wasteful reverse logistics.
*   🤝 **P2P Marketplace:** Facilitating direct, localized peer-to-peer resale of unused items.
*   🔄 **Product Exchange:** Automatically matching users to seamlessly swap items of `±30%` equivalent value.
*   🎁 **Donation Hub:** Providing a frictionless avenue for users to list items for free, routing goods to those in need.
*   🌱 **Green Credits Engine:** Quantifying CO₂ saved by sustainable actions into an eco-ledger, rewarding users with cashbacks and discounts.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 19, Vite 6
*   **Styling & UI:** Tailwind CSS, Framer Motion

### Backend & Data
*   **API Engine:** Python, FastAPI
*   **Database & Auth:** Supabase (PostgreSQL)

### AI & Machine Learning
*   **Models:** PyTorch, HuggingFace CLIP (ViT-B/32), Scikit-Learn

### Infrastructure
*   **Cloud:** AWS EC2 (ML Inference), AWS S3 (Storage)
*   **Deployment:** Vercel (Frontend CDN)

---

## ⚙️ Local Setup & Installation

### Prerequisites
Make sure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Python](https://www.python.org/) (3.9+)
*   [Git](https://git-scm.com/)

### 1️⃣ Clone the Repository
```bash
git clone [https://github.com/tastypiranha/amazon_hackon.git](https://github.com/tastypiranha/amazon_hackon.git)
cd amazon_hackon
