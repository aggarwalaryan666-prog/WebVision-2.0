# ValueWise

**ValueWise** is an e-commerce-style web application that helps shoppers
make informed purchasing decisions through product comparisons,
explainable value scoring, review insights, and personalized
recommendations. It also integrates **AccessCart**, a set of
accessibility features designed to make shopping easier for people with
different needs.

> **Project status:** Hackathon prototype\
> **Implementation target:** Approximately 2--2.5 hours\
> **Data:** Local sample product data; no live marketplace integration

## Table of Contents

-   [Overview](#overview)
-   [Key Features](#key-features)
-   [Technology Stack](#technology-stack)
-   [Application Structure](#application-structure)
-   [Value Score](#value-score)
-   [Accessibility](#accessibility)
-   [API Endpoints](#api-endpoints)
-   [Getting Started](#getting-started)
-   [How to Use](#how-to-use)
-   [Sample Data and Limitations](#sample-data-and-limitations)
-   [Development Priorities](#development-priorities)
-   [Future Improvements](#future-improvements)

## Overview

Most shopping platforms provide filters, ratings, and product
descriptions, but shoppers may still find it difficult to decide which
product offers the best value for their needs. ValueWise aims to make
that decision easier.

The application combines two connected experiences:

-   **ValueWise -- Intelligent Shopping:** Search, explore, compare, and
    evaluate products.
-   **AccessCart -- Accessibility:** Use voice search, read-aloud, text
    resizing, and high-contrast display options.

The goal is to deliver a working, integrated prototype with a clear and
usable shopping journey---not to recreate or connect to Amazon or
another marketplace.

## Key Features

### 1. Product Discovery

-   Browse a catalogue of at least 12 realistic sample products across
    multiple categories.
-   View product images, names, prices, ratings, and short descriptions.
-   Search by product name or category.
-   Filter and sort products by price, rating, and other useful
    criteria.
-   Open a dedicated product details view.

### 2. Product Details

Product detail views can include:

-   Product description
-   Key specifications and features
-   Price and rating
-   Warranty information
-   Sample customer reviews
-   Review insights and Value Score

### 3. Product Comparison

-   Compare up to three products side by side.
-   Review important differences such as price, rating, features, and
    warranty.
-   Use the comparison to make a more informed decision.

### 4. Review Intelligence

ValueWise summarizes common positive and negative themes from a clearly
labelled sample review dataset.

Examples of themes may include:

-   Battery life
-   Build quality
-   Performance
-   Ease of use
-   Value for money

**Important:** This prototype uses simple, rule-based analysis of sample
reviews. It is not a trained AI model, and its output should not be
treated as an analysis of live marketplace reviews.

### 5. Explainable Value Score

Each product can receive a score out of 100 based on four normalized
components:

\[ `\text{Value Score}`{=tex} = 0.30R + 0.25F + 0.20W + 0.25P \]

Where:

  ------------------------------------------------------------------------
  Component                                   Weight Meaning
  --------------------- ---------------------------- ---------------------
  R -- Review quality                            30% Normalized quality
                                                     indicator derived
                                                     from the sample
                                                     review data

  F -- Feature                                   25% How well the
  suitability                                        product's features
                                                     match the selected
                                                     criteria

  W -- Warranty                                  20% Normalized warranty
                                                     assessment

  P -- Price-value                               25% How competitively
                                                     priced the product is
                                                     under the prototype's
                                                     scoring rules
  ------------------------------------------------------------------------

Each component must be normalized to a value from **0 to 100** before
applying the formula.

The interface should explain the component scores and the final result.
The Value Score is a decision-support indicator, not an objective
guarantee that a product is best. Results depend on the sample data and
scoring rules.

### 6. Smart Recommendations

Users can select a shopping priority, such as:

-   Lowest price
-   Best features
-   Best warranty
-   Best overall value

The application recommends a suitable product and explains the reason
behind the recommendation. Recommendations should be based on the
available sample data and transparent rules.

### 7. Cart

-   Add products to the cart.
-   Increase or decrease item quantities.
-   Remove items.
-   View the cart total.
-   Persist cart contents in browser `localStorage` so they remain after
    a page refresh.

This is a demonstration cart only; it does not process payments or place
real orders.

### 8. AccessCart -- Accessibility Features

-   **Voice search:** Use the browser Web Speech API where supported.
-   **Typed search:** Always provide a normal text-search alternative.
-   **Read aloud:** Use the browser SpeechSynthesis API to read product
    descriptions and review summaries.
-   **Text resizing:** Increase or decrease the displayed text size.
-   **High contrast:** Switch to a high-contrast presentation.
-   **Accessible interaction:** Use semantic HTML, descriptive labels,
    keyboard navigation, visible focus indicators, and useful image
    alternative text.

Browser speech support can vary by browser, device, and language. The
application should handle unsupported features gracefully and keep
equivalent non-voice controls available.

## Technology Stack

  Area               Technology
  ------------------ -----------------------------------------
  Frontend           React
  Frontend tooling   Vite
  Backend            Node.js and Express
  Sample data        Local JSON dataset
  Styling            CSS or a lightweight styling approach
  Voice search       Browser Web Speech API, where supported
  Read aloud         Browser SpeechSynthesis API
  Cart persistence   Browser `localStorage`

The project intentionally avoids unnecessary infrastructure, external
shopping integrations, and a separate Python machine-learning service.

## Application Structure

The project should keep frontend and backend code separate and easy to
understand.

A suggested structure is:

``` text
valuewise/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   ├── ComparePanel.jsx
│   │   │   ├── ReviewInsights.jsx
│   │   │   ├── ValueScore.jsx
│   │   │   ├── RecommendationPanel.jsx
│   │   │   ├── AccessibilityPanel.jsx
│   │   │   └── Cart.jsx
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles/
│   └── package.json
├── backend/
│   ├── data/
│   │   └── products.json
│   ├── routes/
│   ├── server.js
│   └── package.json
└── README.md
```

This is a suggested layout, not a requirement to create every folder or
file immediately. Keep the actual structure aligned with the
implementation and avoid adding empty or unnecessary modules.

## Suggested Pages

1.  **Home:** Introduce ValueWise and provide product discovery.
2.  **Search / Results:** Show matching products with filtering and
    sorting.
3.  **Product Details:** Present specifications, reviews, review
    insights, and Value Score.
4.  **Product Comparison:** Compare up to three selected products.
5.  **Shopping Cart:** Manage quantities and view the cart total.

Accessibility controls should be available throughout the shopping
journey rather than isolated on a separate page.

## API Endpoints

The Express backend can expose the following endpoints:

  --------------------------------------------------------------------------
  Method                  Endpoint                   Purpose
  ----------------------- -------------------------- -----------------------
  `GET`                   `/api/products`            Return the product
                                                     catalogue

  `GET`                   `/api/products/:id`        Return details for one
                                                     product

  `GET`                   `/api/compare?ids=1,2,3`   Return data for up to
                                                     three products

  `POST`                  `/api/insights`            Generate rule-based
                                                     insights from sample
                                                     reviews

  `POST`                  `/api/recommend`           Recommend a product
                                                     based on the selected
                                                     priority
  --------------------------------------------------------------------------

Validate IDs, request bodies, and comparison limits. Return useful HTTP
status codes and clear error messages for invalid input or missing
products.

The frontend and backend must agree on endpoint paths and response
formats. If a feature is implemented entirely in the frontend for the
prototype, document that choice rather than leaving a non-working API
call.

## Getting Started

### Prerequisites

Install:

-   Node.js (an active LTS version is recommended)
-   npm
-   A modern browser

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd valuewise
```

Replace `<your-repository-url>` with the URL of your repository.

### 2. Install backend dependencies

``` bash
cd backend
npm install
```

### 3. Start the backend

``` bash
npm run dev
```

If the backend does not define a `dev` script, use the start script
configured in `backend/package.json`, for example:

``` bash
npm start
```

### 4. Install frontend dependencies

Open a second terminal:

``` bash
cd valuewise/frontend
npm install
```

### 5. Start the frontend

``` bash
npm run dev
```

Open the local URL printed by Vite in your terminal (commonly
`http://localhost:5173`).

> **Note:** These commands assume the corresponding npm scripts have
> been configured. Add or adjust scripts in each `package.json` to match
> the actual project. Configure the frontend API base URL to point to
> the local Express server.

## How to Use

1.  Browse the product catalogue or search by name or category.
2.  Apply filters or sorting to narrow down the results.
3.  Open a product to view its specifications, warranty, and sample
    reviews.
4.  Read the review themes and inspect the components of its Value
    Score.
5.  Add up to three products to the comparison view.
6.  Select a shopping priority to receive a recommendation with an
    explanation.
7.  Add products to the cart and adjust quantities.
8.  Try AccessCart controls: voice search (if supported), read aloud,
    text resizing, and high contrast.
9.  Refresh the page to verify that the cart is restored from
    `localStorage`.

## Sample Data and Limitations

-   The product catalogue is local sample data, not live inventory.
-   Prices, ratings, warranties, specifications, and reviews are
    illustrative.
-   Review insights are generated using rule-based logic over the sample
    dataset.
-   Value Scores depend on the chosen normalization and scoring rules.
-   Recommendations are based on the prototype's available data and
    selected priority.
-   Voice features depend on browser and device support.
-   The cart does not connect to a payment gateway or create real
    orders.
-   The application does not include production authentication, order
    management, or external marketplace integrations.

Do not present sample review analysis, product availability, or
recommendations as verified real-world marketplace information.

## Development Priorities

Given the 2--2.5 hour hackathon implementation window, prioritize a
complete and demonstrable core flow:

1.  Set up the React/Vite frontend, Express backend, and local product
    JSON.
2.  Build the catalogue, product cards, search, and product details.
3.  Implement product comparison for up to three products.
4.  Add transparent Value Score calculation and simple review insights.
5.  Add priority-based recommendations with clear explanations.
6.  Implement cart quantity controls and `localStorage` persistence.
7.  Add and test the most useful AccessCart features.
8.  Test the integrated application and fix critical issues before
    polishing.

Prefer a smaller feature that works end to end over a larger feature
that is incomplete.

## Future Improvements

Possible extensions after the hackathon prototype include:

-   More robust review-topic extraction and sentiment analysis.
-   User-defined feature weights for personalized scoring.
-   Improved product recommendation rules.
-   More detailed keyboard and screen-reader testing.
-   Better localization and speech-language selection.
-   Automated frontend and API tests.
-   A database if the project later needs persistent shared product
    data.

These are future possibilities, not prerequisites for the initial
hackathon version.

------------------------------------------------------------------------

**ValueWise -- Shop smarter. Compare clearly. Choose confidently.**\
**AccessCart -- Making online shopping more accessible.**
