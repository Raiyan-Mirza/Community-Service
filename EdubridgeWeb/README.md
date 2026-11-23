# EduBridge

EduBridge is a small website concept for sharing education related requests and offers. It has a home page, learner request form, volunteer and donor offer forms, a community board, an example organisation directory, and a simple overview page.

## Start the website

You need Node.js installed. No extra packages are needed.

1. Open this folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Type `npm start` and press Enter.
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

Keep the terminal window open while you use the site. Press Ctrl+C there when you want to stop it. Opening `index.html` directly will not connect the forms to the server; start the site using these steps instead.

## How saving works

`server.js` serves the website and handles a few small requests from the browser. It uses only Node's built in tools. When it starts, it creates `data/requests.json` with example listings if that file does not exist. New forms and status changes are saved there, so they stay after the server is restarted. The dashboard's reset button restores the sample listings.

The data file is local to this copy of the project. This server listens only on this computer and has no accounts or sign-in. Do not put private information in it or expose it to the public internet.

## What this project does not do

All people, requests, and organisation names are examples. There are no real NGO partnerships or verified users. The site does not provide real support, matching, chat, video calls, payments, or delivery. Any real connections would need to be arranged safely offline. The dashboard is a demonstration view, not a protected administrator account.
