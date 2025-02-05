document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // socet connection with server
  
// sign up 
    const signupForm = document.getElementById('signupForm'); // getting the signup form
    if (signupForm) { // setting up event listener
      signupForm.addEventListener('submit', async (e) => { 
        e.preventDefault(); // preventing default form submission
        
        // getting the values from the form 
        const username = document.getElementById('username').value.trim();
        const firstname = document.getElementById('firstname').value.trim();
        const lastname = document.getElementById('lastname').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // displaying alert for empty fields
        if (!username || !firstname || !lastname || !password) {
          alert("Please fill in all fields.");
          return;
        }
  
        const data = { username, firstname, lastname, password }; // created a object t0 send to tje server
  
        try {
            // sending post request to sign up the user
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data) // sending data in a json string
          });
          const result = await res.json(); // examining the response from server
          if (res.ok) { // if successful
            alert(result.msg); // display a success message
            window.location.href = '/login.html'; // redirect  to login page
          } else { // if error - displaying a err message
            alert(result.msg);
          }
        } catch (error) {
          console.error('Signup Error:', error); // logging 
          alert('Error during signup.'); // displaying error is from signup
        }
      });
    }
  
// log in
    const loginForm = document.getElementById('loginForm'); // getting the login form
    if (loginForm) { // gif exists then...
      loginForm.addEventListener('submit', async (e) => { // submit event listemer to the login form
        e.preventDefault();// prevents default submission
  
        // getting values
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
  
        // alert for empty fields
        if (!username || !password) {
          alert("Please enter both username and password.");
          return;
        }
        
        const data = { username, password }; // object created to send to server
  
        try { // sending a post request to server to login the user
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data) // sending in json string
          });
          const result = await res.json(); // parse response
          if (res.ok) { // if successful....
            alert(result.msg); // show success message
            localStorage.setItem('username', result.username); // store username in localstorage
            window.location.href = '/chat.html'; // go to chat page
          } else {
            alert(result.msg); // show error if any
          }
        } catch (error) {
          console.error('Login Error:', error); // logging error
          alert('Error during login.'); // display that error is from login
        }
      });
    }
  
// Chat
    const chatMessages = document.getElementById('chatMessages');
    const joinRoomBtn = document.getElementById('joinRoom');
    const roomSelect = document.getElementById('roomSelect');
    const sendMessageBtn = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    const typingIndicator = document.getElementById('typingIndicator');
  
    if (chatMessages && joinRoomBtn && sendMessageBtn && messageInput && roomSelect) {
      let currentRoom = ''; // using empty variable to store room user is in 
      const username = localStorage.getItem('username'); // getting username from LS
      if (!username) { // if user not found - redicrecting to login page
        alert("You must log in first.");
        window.location.href = '/login.html';
        return;
      }
  
      // join room
      joinRoomBtn.addEventListener('click', () => {
        const selectedRoom = roomSelect.value; // get room thats selected
        if (currentRoom) {// if user is in room leave room first
          socket.emit('leaveRoom', { username, room: currentRoom });
        }
        currentRoom = selectedRoom; // current room is set to selected room
        socket.emit('joinRoom', { username, room: currentRoom }); // joing the room that was selected by the user
        chatMessages.innerHTML = ''; // clear prior messages before user was in room
      });
  
      socket.on('previousMessages', (messages) => {
        messages.forEach(msg => {
          const msgElem = document.createElement('p'); // new p for each message
          msgElem.innerHTML = `<strong>${msg.from_user}</strong>: ${msg.message}`;
          chatMessages.appendChild(msgElem); // append message to display
        });
      });
  
      sendMessageBtn.addEventListener('click', () => {
        const message = messageInput.value.trim(); // get imput
        if (message && currentRoom) { // if room selected and message os not empty
          socket.emit('chatMessage', { username, room: currentRoom, message }); // send message to server
          messageInput.value = ''; // clear the input field
        }
      });
  
      // listening for new message
      socket.on('message', (data) => {
        const msgElem = document.createElement('p');
        msgElem.innerHTML = `<strong>${data.username}</strong>: ${data.message}`;
        chatMessages.appendChild(msgElem);
      });
  
      // typing input detectiom
      messageInput.addEventListener('input', () => {
        if (currentRoom) {
          socket.emit('typing', { username, room: currentRoom });
        }
      });
  
      // display typing indicator
      socket.on('typing', (data) => {
        typingIndicator.innerText = `${data.username} is typing...`; // display typing message
        setTimeout(() => {
          typingIndicator.innerText = '';
        }, 2000);
      });
    }


// private chat -- not implemented

// Listen for private messages from server
socket.on('privateMessage', (data) => {
    const msgElem = document.createElement('p');
    msgElem.innerHTML = `<strong>${data.from_user} (Private):</strong> ${data.message}`;
    privateMessagesDiv.appendChild(msgElem);
});

  
// logging out
const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('username'); // Remove username from localStorage
            window.location.href = '/login.html'; // Redirect to login page
        });
    }
  });
  