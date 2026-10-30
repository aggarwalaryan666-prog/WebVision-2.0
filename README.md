# VALUEWISE – Shop Smarter, Choose Better

**ValueWise** is an intelligent and accessibility-focused e-commerce web application designed to help users make smarter, more informed purchasing decisions.

Unlike traditional shopping platforms that mainly focus on displaying products and providing filters, ValueWise focuses on helping users understand which product actually offers the best value according to their needs, preferences, and budget.

It also integrates **AccessCart**, an accessibility-focused shopping experience that makes online shopping easier for users with different accessibility needs.

## 1. Problem Statement

Online shopping platforms offer thousands of products with different prices, specifications, ratings, and customer reviews. Although users can filter and sort products, choosing the right product can still be confusing and time-consuming.

## We identified the following problems:

### 1. Information Overload
Users often have to visit multiple product pages and manually examine specifications, prices, and ratings to understand which product is better.

### 2. Difficulty in Product Comparison
Comparing multiple products across different specifications, warranty periods, prices, and features can be difficult. Existing comparison options may not explain which product is more suitable for a particular user's needs.

### 3. Misleading or Overwhelming Reviews
Products often have hundreds or thousands of customer reviews. Reading all of them takes time, and users may struggle to identify common advantages and disadvantages.

### 4. No Clear Understanding of Actual Value
A product with a higher rating or lower price is not necessarily the best choice. Users need to consider several factors, including product quality, features, warranty, and price together.

### 5. Accessibility Barriers
Many shopping experiences are not equally convenient for everyone. Users who prefer voice interaction, need larger text, or benefit from high-contrast displays may face difficulties while browsing and understanding product information.

## 2. Our Proposed Solution

To address these problems, we propose **ValueWise**, an intelligent shopping assistant integrated into an accessible e-commerce platform.

Instead of simply showing users products, ValueWise helps them understand, evaluate, and choose products based on their actual priorities.

Our solution consists of two integrated components:

### A. ValueWise – Intelligent Shopping Assistant

**1. Smart Product Discovery**

Users can browse products across multiple categories, search by product name, and apply filters based on price, ratings, and other criteria.

**2. Side-by-Side Product Comparison**

Users can select up to three products and compare their prices, specifications, ratings, features, and warranty information in one place.

**3. Intelligent Review Insights**

Instead of manually reading numerous reviews, users can view commonly mentioned positive and negative points.

For example:
- Positive: Good battery life, excellent performance, and build quality.
- Negative: Slow charging, heating issues, and average camera quality.

These insights will be generated using rule-based analysis of a clearly labelled sample review dataset.

**4. Explainable Value Score**

We introduce a Value Score out of 100 to help users evaluate products using multiple factors.

Value Score = 0.30R + 0.25F + 0.20W + 0.25P

Where:
- R = Review Quality
- F = Feature Suitability
- W = Warranty
- P = Price-Value

Each factor is normalized between 0 and 100.

This gives users a more comprehensive evaluation instead of relying only on price or star ratings.

**5. Smart Recommendations**

Users can select what matters most to them:
- Lowest Price
- Best Features
- Best Warranty
- Best Overall Value

Based on their selection, ValueWise recommends a suitable product and explains why it is recommended.

### B. AccessCart – Accessible Shopping Experience

We believe online shopping should be convenient for everyone.

AccessCart integrates accessibility features directly into the shopping experience:

- Voice Search: Search for products using voice commands where browser support is available.
- Read Aloud: Listen to product descriptions and review summaries.
- Text Resizing: Increase or decrease text size according to user preference.
- High Contrast Mode: Improve readability through better visual contrast.
- Keyboard Navigation: Navigate important shopping features using a keyboard.
- Accessible Interface: Provide semantic HTML, descriptive labels, visible focus indicators, and meaningful image descriptions.

## 3. What Makes ValueWise Different?

| Traditional Shopping Experience | Our Proposed ValueWise Solution |
|---|---|
| Displays product information | Helps users evaluate products |
| Users manually read reviews | Provides summarized review themes |
| Users compare specifications themselves | Provides side-by-side comparison |
| Users mainly depend on price and ratings | Provides an explainable Value Score |
| Users search for products manually | Supports voice search where available |
| Accessibility options may be limited | Integrates accessibility into shopping |

Our main objective is not to replace existing e-commerce platforms but to improve the way people discover, evaluate, and select products.

## 4. Expected Impact

ValueWise aims to:

- Reduce the time required to make purchasing decisions.
- Help users identify products that match their priorities.
- Make product reviews easier to understand.
- Improve transparency in product evaluation.
- Reduce confusion caused by excessive product information.
- Make online shopping more accessible and user-friendly.

## 5. Technology Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Data: Local JSON sample product dataset
- Styling: CSS
- Voice Search: Web Speech API
- Read Aloud: SpeechSynthesis API
- Cart Persistence: Browser localStorage

## 6. Project Vision

Our vision is to transform online shopping from simply browsing products into making confident and informed purchasing decisions.

**ValueWise – Don't just shop for products. Understand their value.**

**AccessCart – Making shopping accessible for everyone.**
