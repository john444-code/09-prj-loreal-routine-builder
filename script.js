/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const rtlToggle = document.getElementById("rtlToggle");

/* Array to hold selected products */
let selectedProducts = [];

/* Load selected products from localStorage */
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      return `
    <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <div class="product-description">${product.description}</div>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click handlers for selection
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const productId = parseInt(card.dataset.id);
      const product = products.find((p) => p.id === productId);
      toggleProductSelection(product);
    });
  });
}

/* Toggle product selection */
function toggleProductSelection(product) {
  const index = selectedProducts.findIndex((p) => p.id === product.id);
  if (index > -1) {
    selectedProducts.splice(index, 1);
  } else {
    selectedProducts.push(product);
  }
  saveSelectedProducts();
  updateSelectedProductsDisplay();
  // Re-display current products to update selection state
  const currentCategory = categoryFilter.value;
  if (currentCategory) {
    loadProducts().then((products) => {
      const filtered = products.filter((p) => p.category === currentCategory);
      displayProducts(filtered);
    });
  }
}

/* Update the selected products display */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "<p>No products selected yet.</p>";
    generateRoutine.disabled = true;
  } else {
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
        <div class="selected-item" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="selected-info">
            <h4>${product.name}</h4>
            <p>${product.brand}</p>
          </div>
          <button class="remove-btn" data-id="${product.id}">×</button>
        </div>
      `,
      )
      .join("");
    generateRoutine.disabled = false;
  }

  // Add remove handlers
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.dataset.id);
      selectedProducts = selectedProducts.filter((p) => p.id !== productId);
      saveSelectedProducts();
      updateSelectedProductsDisplay();
      // Re-display products
      const currentCategory = categoryFilter.value;
      if (currentCategory) {
        loadProducts().then((products) => {
          const filtered = products.filter(
            (p) => p.category === currentCategory,
          );
          displayProducts(filtered);
        });
      }
    });
  });
}

/* Filter and display products when category or search changes */
function filterAndDisplayProducts() {
  loadProducts().then((products) => {
    const selectedCategory = categoryFilter.value;
    const searchTerm = productSearch.value.toLowerCase();

    let filteredProducts = products;

    if (selectedCategory) {
      filteredProducts = filteredProducts.filter(
        (product) => product.category === selectedCategory,
      );
    }

    if (searchTerm) {
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm),
      );
    }

    if (filteredProducts.length === 0) {
      productsContainer.innerHTML =
        '<div class="placeholder-message">No products match your search.</div>';
    } else {
      displayProducts(filteredProducts);
    }
  });
}

categoryFilter.addEventListener("change", filterAndDisplayProducts);
productSearch.addEventListener("input", filterAndDisplayProducts);

/* Generate routine button handler */
generateRoutine.addEventListener("click", async () => {
  if (selectedProducts.length === 0) return;

  // Prepare message for AI
  const productsText = selectedProducts
    .map(
      (p) =>
        `Brand: ${p.brand}, Name: ${p.name}, Category: ${p.category}, Description: ${p.description}`,
    )
    .join("\n");

  const message = `Based on these selected L'Oréal products:\n${productsText}\n\nCreate a personalized skincare/haircare/makeup routine. Include step-by-step instructions, when to use each product, and any tips. Keep it concise but helpful.`;

  // Call AI API
  const response = await callOpenAI(message);
  displayMessage("AI Advisor", response);

  // Enable chat for follow-ups
  chatWindow.dataset.routineGenerated = "true";
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  displayMessage("You", message);
  userInput.value = "";

  // If routine not generated yet, remind user
  if (!chatWindow.dataset.routineGenerated) {
    displayMessage(
      "AI Advisor",
      "Please select some products and generate a routine first!",
    );
    return;
  }

  // Get conversation history
  const history = getChatHistory();

  // Call AI with context
  const context = `You are a helpful beauty advisor for L'Oréal products. The user has selected these products and generated a routine:\n${selectedProducts.map((p) => `${p.brand} ${p.name}: ${p.description}`).join("\n")}\n\nConversation history:\n${history}\n\nUser question: ${message}\n\nAnswer helpfully, focusing on skincare, haircare, makeup, or related topics.`;

  const response = await callOpenAI(context);
  displayMessage("AI Advisor", response);
});

/* Function to call OpenAI API via Cloudflare Worker */
async function callOpenAI(message) {
  // Replace with your Cloudflare Worker URL
  const workerUrl = "09-prj-loreal-routine-builder.john-abdelmalak-office.workers.dev";

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

/* Display message in chat window */
function displayMessage(sender, message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message";
  messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Get chat history as text */
function getChatHistory() {
  const messages = Array.from(chatWindow.querySelectorAll(".chat-message"));
  return messages.map((msg) => msg.textContent).join("\n");
}

/* Initialize on load */
document.addEventListener("DOMContentLoaded", () => {
  loadSelectedProducts();
  updateSelectedProductsDisplay();
  // RTL Toggle
  rtlToggle.addEventListener("click", () => {
    document.body.classList.toggle("rtl");
    rtlToggle.textContent = document.body.classList.contains("rtl")
      ? "LTR"
      : "RTL";
  });
});
