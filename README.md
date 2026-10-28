# 🌿 ArmHerbs v2 — AI-Powered Medicinal Herb Search

**An AI-powered web application for exploring medicinal herbs and retrieving relevant herbal information using semantic search and Retrieval-Augmented Generation (RAG).**

🌐 **Live Website:** [https://armherbs.com/](https://armherbs.com/)

## 📌 Overview

ArmHerbs v2 is a web application designed to help users explore medicinal herbs, their properties, traditional uses, and information related to symptoms.

The application combines a modern web interface, a Python backend, and AI-powered search capabilities to make herbal information easier to discover and understand.

By integrating text embeddings, similarity search, and Retrieval-Augmented Generation (RAG), the project explores how AI can connect users' questions with relevant information from a specialized knowledge base.

The project demonstrates the practical integration of AI technologies into a full-stack web application.

## ✨ Key Features

- **Herbal Knowledge Base:** Structured information about medicinal herbs, including names, alternative names, descriptions, properties, traditional uses, and related symptoms.
- **AI-Powered Search:** Uses text embeddings and similarity-based retrieval to help identify relevant herbal information.
- **Semantic Search:** Supports meaning-based information retrieval rather than relying exclusively on exact keyword matches.
- **RAG-Based Responses:** Connects information retrieval with generative AI to provide responses grounded in relevant retrieved context.
- **Symptom-Based Search:** Helps users explore herbal information related to specific symptoms.
- **Smart Search:** Combines search-related functionality to improve the process of finding relevant information.
- **Autocomplete:** Helps users formulate search queries.
- **Modular Backend:** Separates AI-related functionality, natural language processing, and search logic into dedicated components.

## 🤖 AI & Search Architecture

A key technical aspect of ArmHerbs v2 is the integration of AI-powered information retrieval with a specialized herbal knowledge base.

### 1. Text Embeddings

The application uses OpenAI embeddings to represent textual information as numerical vectors.

These vector representations capture semantic relationships between pieces of text and allow the search system to compare information based on meaning.

Embeddings provide the foundation for similarity-based retrieval.

### 2. Similarity Search

Similarity search compares the vector representation of a user's query with stored vector representations of herbal information.

The search system uses similarity to identify information that is semantically related to the user's question.

For example, a user may describe a symptom using different words from those used in a herb's description. Similarity-based retrieval can help identify relevant information even when the wording is not identical.

### 3. Semantic Search

Semantic search focuses on the meaning and context of a query rather than relying exclusively on exact keyword matches.

By using text embeddings and similarity-based retrieval, the application can search for information based on semantic relevance.

This approach is particularly useful when users express the same idea in different ways.

### 4. Retrieval-Augmented Generation (RAG)

Retrieval-Augmented Generation (RAG) combines information retrieval with generative AI.

Instead of relying exclusively on a language model's existing knowledge, a RAG workflow retrieves relevant information from an external knowledge source and supplies it as context for response generation.

The general workflow consists of:

1. Receiving a user's question.
2. Searching the herbal knowledge base for relevant information.
3. Retrieving relevant text or document content.
4. Providing the retrieved context to a generative AI model.
5. Generating a response informed by the retrieved information.

This architecture can help make AI-generated responses more relevant to the application's specialized knowledge base.

### 5. Natural Language Processing (NLP)

The backend includes NLP-related functionality to process search queries and support the identification of relevant herbal information.

NLP components work alongside the search functionality to help connect users' questions with relevant content.

### 6. Knowledge Base and Data Processing

The application organizes herbal information and symptom-related data to support search and retrieval.

Dedicated backend components handle different parts of the application, including AI-related functionality, language processing, and search logic.

This modular design helps keep responsibilities separated and makes the system easier to maintain and extend.

## 🛠️ Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Backend | Python, FastAPI |
| AI Integration | OpenAI API |
| Embeddings | OpenAI Text Embeddings |
| Information Retrieval | Similarity Search, Semantic Search |
| AI Architecture | Retrieval-Augmented Generation (RAG) |
| Language Processing | Natural Language Processing (NLP) |
| Data Processing | Python, JSON |
| Version Control | Git, GitHub |

## 🏗️ Project Structure

The project is organized into separate frontend and backend components.

```text
armherbs-v2/
│
├── backend/
│   ├── app/
│   ├── data/
│   ├── scripts/
│   ├── .direnv/
│   ├── main.py
│   ├── requirements.txt
│   ├── requirements.lock
│   └── README_BACKEND.md
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── .envrc
├── .gitignore
├── LICENSE
└── README.md
```

### Frontend

The frontend is built with React and TypeScript.

It provides the user interface and connects users with the application's search and herbal information features.

### Backend

The backend is built with Python and FastAPI.

It handles backend application functionality and organizes AI integration, natural language processing, and search-related operations.

### Data and Scripts

The backend contains dedicated directories for application data and supporting scripts.

Additional backend documentation is available in `backend/README_BACKEND.md`.

## 🔄 How the AI-Powered Search Works

The following describes the general embedding-based retrieval and RAG workflow.

### Step 1: Prepare the Herbal Information

Herbal descriptions and related information are organized into textual data that can be used by the search system.

### Step 2: Generate Embeddings

An embedding model converts the text into numerical vectors representing semantic information.

### Step 3: Process the User's Query

When a user submits a question, the search system processes the query and prepares it for retrieval.

### Step 4: Perform Similarity Search

The system compares the query representation with stored embeddings to identify semantically relevant information.

### Step 5: Retrieve Relevant Context

Relevant information is retrieved from the herbal knowledge base.

### Step 6: Generate an AI Response

In the RAG workflow, the retrieved information is supplied to a generative AI model as context for generating a response.

### Step 7: Present the Results

The application presents the resulting information through its user interface.

The exact processing steps depend on the search functionality used for a particular request.

## 💡 Skills Demonstrated

This project demonstrates practical experience in full-stack development and AI integration.

### AI Engineering and Information Retrieval

- Integrating AI capabilities through an external API.
- Working with text embeddings and numerical vector representations.
- Applying similarity search to retrieve relevant information.
- Using semantic search concepts for natural language queries.
- Integrating retrieval and generation in a RAG workflow.
- Organizing domain-specific information for AI-assisted retrieval.
- Connecting retrieved information with AI-generated responses.

### Backend Development

- Developing backend functionality with Python and FastAPI.
- Organizing application logic into modular components.
- Separating AI-related operations, NLP processing, and search logic.
- Working with structured data and JSON files.
- Building backend functionality to support a web application's search features.

### Frontend Development

- Building a web interface with React and TypeScript.
- Organizing frontend application code into components.
- Connecting the user interface with backend functionality.
- Developing user-facing search features.

### Software Development Practices

- Structuring a full-stack application with separate frontend and backend components.
- Managing source code with Git and GitHub.
- Maintaining project documentation.
- Developing and improving an application through an iterative workflow.

## 🚀 Future Improvements

Potential areas for further development include:

- Evaluating retrieval quality using a dedicated test dataset.
- Improving semantic search relevance and result ranking.
- Comparing different embedding models and retrieval strategies.
- Improving the relevance and reliability of RAG-generated responses.
- Adding automated tests for critical application functionality.
- Improving error handling, logging, and application monitoring.
- Expanding and maintaining the herbal knowledge base.

## ⚠️ Medical Disclaimer

ArmHerbs is intended for informational and educational purposes only.

Information provided by the application is not a substitute for professional medical advice, diagnosis, or treatment.

The inclusion of a medicinal herb does not establish that it is effective or safe for a particular health condition. Users should consult a qualified healthcare professional before using medicinal herbs for health concerns.

AI-generated responses may be incomplete or inaccurate and should not be treated as verified medical guidance.

## 👨‍💻 Author

**Vladimir Saponjyan**

Interested in artificial intelligence, machine learning, and software development, with a focus on building practical applications that combine AI capabilities with real-world user needs.

---

⭐ Explore the live application: [https://armherbs.com/](https://armherbs.com/)
