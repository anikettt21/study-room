// Global variables for hall seat management
let hall = "";
let soldSeats = [];                 // Sold seats (fetched from server)
let removedSeats = [];              // Temporarily removed seats
let permanentlyRemovedSeats = [];   // Permanently removed seats
let totalSeats = 50;                // Default capacity

// Fetch and render the seat layout
function fetchAndRenderSeats() {
  hall = window.location.pathname.includes('hall1') ? 'hall1' : 'hall2';
  
  const storedTotal = parseInt(localStorage.getItem('totalSeats_' + hall)) || 50;
  
  fetch(`http://localhost:3000/seats/${hall}`)
    .then(response => response.json())
    .then(data => {
      // Extract seat numbers from the fetched data
      soldSeats = data.map(item => item.seat_number);
      const maxSold = soldSeats.length > 0 ? Math.max(...soldSeats) : 0;
      totalSeats = Math.max(storedTotal, 50, maxSold);
      renderSeats();
    })
    .catch(error => console.error('Error:', error));
}

function renderSeats() {
  const seatLayout = document.getElementById('seat-layout');
  seatLayout.innerHTML = '';
  
  for (let i = 1; i <= totalSeats; i++) {
    const seat = document.createElement('div');
    seat.classList.add('seat');
    seat.textContent = i;
    
    if (soldSeats.includes(i)) {
      seat.classList.add('sold');
    } else if (permanentlyRemovedSeats.includes(i)) {
      seat.classList.add('removed-permanent');
      addEditIcon(seat, i);
    } else if (removedSeats.includes(i)) {
      seat.classList.add('removed');
      addEditIcon(seat, i);
    } else {
      seat.classList.add('available');
    }
    
    seatLayout.appendChild(seat);
  }
}

function addEditIcon(seatElement, seatNumber) {
  const editIcon = document.createElement('span');
  editIcon.className = 'edit-icon';
  editIcon.innerHTML = '&#9998;';
  editIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    handleEditSeat(seatNumber);
  });
  seatElement.appendChild(editIcon);
}

function handleEditSeat(seatNumber) {
  const choice = prompt(`For seat ${seatNumber}:\nEnter 1 to restore this seat.\nEnter 2 to mark it permanently removed.`);
  if (choice === "1") {
    removedSeats = removedSeats.filter(num => num !== seatNumber);
    permanentlyRemovedSeats = permanentlyRemovedSeats.filter(num => num !== seatNumber);
  } else if (choice === "2") {
    removedSeats = removedSeats.filter(num => num !== seatNumber);
    if (!permanentlyRemovedSeats.includes(seatNumber)) {
      permanentlyRemovedSeats.push(seatNumber);
    }
  }
  renderSeats();
}

// Admin verification helper
function verifyAdmin() {
  return new Promise((resolve, reject) => {
    const adminPass = prompt("Enter Admin Password:");
    if (!adminPass) {
      alert("Admin password is required.");
      reject();
      return;
    }
    fetch("http://localhost:3000/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPass })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => { 
            throw new Error(data.error || "Incorrect password"); 
          });
        }
        return response.json();
      })
      .then(() => { resolve(); })
      .catch(err => {
        alert(err.message);
        reject();
      });
  });
}

// PLUS button: Add/restore a seat after admin verification
document.getElementById('add-seat-button').addEventListener('click', function() {
  verifyAdmin().then(() => {
    const seatInput = prompt("Enter the seat number to add/restore:");
    if (seatInput === null) return;
    const seatNumber = parseInt(seatInput, 10);
    if (isNaN(seatNumber) || seatNumber < 1) {
      alert("Invalid seat number.");
      return;
    }
    if (soldSeats.includes(seatNumber)) {
      alert("This seat is sold and cannot be restored.");
      return;
    }
    if (seatNumber > totalSeats) {
      totalSeats = seatNumber;
      localStorage.setItem('totalSeats_' + hall, totalSeats);
    } else {
      if (!removedSeats.includes(seatNumber) && !permanentlyRemovedSeats.includes(seatNumber)) {
        alert("This seat is already available.");
        return;
      }
      removedSeats = removedSeats.filter(num => num !== seatNumber);
      permanentlyRemovedSeats = permanentlyRemovedSeats.filter(num => num !== seatNumber);
    }
    renderSeats();
  }).catch(() => {});
});

// MINUS button: Remove a seat after admin verification
document.getElementById('remove-seat-button').addEventListener('click', function() {
  verifyAdmin().then(() => {
    const seatInput = prompt("Enter the seat number you want to remove:");
    if (seatInput === null) return;
    const seatNumber = parseInt(seatInput, 10);
    if (isNaN(seatNumber) || seatNumber < 1 || seatNumber > totalSeats) {
      alert("Invalid seat number.");
      return;
    }
    if (soldSeats.includes(seatNumber)) {
      alert(`Seat ${seatNumber} is sold and cannot be removed.`);
      return;
    }
    if (removedSeats.includes(seatNumber) || permanentlyRemovedSeats.includes(seatNumber)) {
      alert(`Seat ${seatNumber} is already removed.`);
      return;
    }
    removedSeats.push(seatNumber);
    renderSeats();
  }).catch(() => {});
});

// ------------------ Monthly Report Functionality ------------------

function showMonthlySeatReport(month) {
  fetch(`http://localhost:3000/seats/${hall}?month=${month}`)
    .then(response => response.json())
    .then(data => {
      const soldCount = data.length;
      const removedCount = removedSeats.length + permanentlyRemovedSeats.length;
      const availableCount = totalSeats - soldCount - removedCount;
      
      const reportDiv = document.getElementById("monthly-report");
      reportDiv.innerHTML = `
        <h3>Monthly Report for ${month}</h3>
        <p>Sold Seats: ${soldCount}</p>
        <p>Removed Seats: ${removedCount}</p>
        <p>Available Seats: ${availableCount}</p>
      `;
    })
    .catch(err => {
      console.error("Error fetching monthly report:", err);
    });
}

function handleMonthChange() {
  const month = document.getElementById("month-select").value;
  if(month) {
    showMonthlySeatReport(month);
  } else {
    document.getElementById("monthly-report").innerHTML = "";
  }
}

// Initialize seat layout on page load
document.addEventListener('DOMContentLoaded', fetchAndRenderSeats);
