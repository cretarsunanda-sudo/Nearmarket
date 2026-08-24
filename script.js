// Sample Data
const services = [
    { name: "Local Grocery Shop", category: "shop", desc: "Daily needs • Nearby", phone: "9876543210" },
    { name: "Delicious Restaurant", category: "food", desc: "Fast Food & Biryani", phone: "9876543211" },
    { name: "Quick Electric Repair", category: "repair", desc: "Fan, TV, AC Repair", phone: "9876543212" },
    { name: "Home Maid / Cleaner", category: "worker", desc: "House Cleaning & Cooking", phone: "9876543213" }
];

// Load Services
function displayServices(data) {
    const list = document.getElementById('services-list');
    list.innerHTML = '';
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <span class="badge">${item.category.toUpperCase()}</span>
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <a href="tel:${item.phone}" class="call-btn">📞 Call ${item.phone}</a>
        `;
        list.appendChild(card);
    });
}

// Filter Function
function filterCategory(cat) {
    if (cat === 'all') {
        displayServices(services);
    } else {
        const filtered = services.filter(s => s.category === cat);
        displayServices(filtered);
    }
}

// Add New Shop Form Popup
function openAddForm() {
    const name = prompt("দোকান বা সার্ভিসের নাম লিখুন:");
    const phone = prompt("মোবাইল নম্বর দিন:");
    const desc = prompt("সংক্ষিপ্ত বিবরণ লিখুন (যেমন: মুদি দোকান / কুরিয়ার):");
    
    if (name && phone) {
        services.unshift({ name, category: "shop", desc: desc || "Local Service", phone });
        displayServices(services);
        alert("আপনার Shop/Service সফলভাবে যুক্ত হয়েছে!");
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    displayServices(services);
});
