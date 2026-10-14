# Architecture
- The Moleca quiz uses React state and focused question and canvas components instead of imperative HTML injection, so navigation and remounting remain reliable.
- Product assets and destinations are centralized in quiz configuration, so scratch cards and result screens always use the same store product.
- Revealed products link to the store; do not imply an implemented free-product checkout or fulfillment without a defined redemption integration.