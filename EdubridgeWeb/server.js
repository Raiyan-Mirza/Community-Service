// EduBridge's small local web server.
// It serves the website and keeps board listings in data/requests.json.
// Everything uses Node's built-in modules, so there are no packages to install.

const http = require('http');
const fs = require('fs');
const path = require('path');

const siteFolder = __dirname;
const dataFolder = path.join(siteFolder, 'data');
const dataFile = path.join(dataFolder, 'requests.json');
const port = 3000;

// These fictional entries make the board useful the first time it is opened.
const sampleRequests = [
  { id: 'r1', type: 'Material', title: 'Grade 8 mathematics workbooks', detail: 'Looking for a set of used maths workbooks for a small study group of five learners.', category: 'Books & supplies', place: 'Pune, Maharashtra', date: 'Posted today', status: 'Open', person: 'Sample listing' },
  { id: 'r2', type: 'Tutor', title: 'Weekend English reading support', detail: 'A volunteer to help two middle-school students practise reading and build confidence.', category: 'Tutoring', place: 'Jaipur, Rajasthan', date: 'Posted yesterday', status: 'Open', person: 'Sample listing' },
  { id: 'r3', type: 'Material', title: 'A refurbished tablet for online lessons', detail: 'One shared device would help a learner attend classes and access free study material.', category: 'Digital access', place: 'Kochi, Kerala', date: 'Posted 2 days ago', status: 'Open', person: 'Sample listing' },
  { id: 'r4', type: 'Tutor', title: 'Basic science homework club', detail: 'Looking for a patient volunteer for a weekly one-hour science session.', category: 'Tutoring', place: 'Lucknow, Uttar Pradesh', date: 'Posted 3 days ago', status: 'Accepted', person: 'Sample listing' },
  { id: 'r5', type: 'Material', title: 'Art materials for after-school learning', detail: 'Colour pencils, drawing paper and simple craft supplies for a neighbourhood group.', category: 'Books & supplies', place: 'Indore, Madhya Pradesh', date: 'Posted 4 days ago', status: 'Open', person: 'Sample listing' },
  { id: 'r6', type: 'Tutor', title: 'Introductory computer skills', detail: 'A few sessions covering typing, email and safe internet basics.', category: 'Digital skills', place: 'Bengaluru, Karnataka', date: 'Posted 5 days ago', status: 'Completed', person: 'Sample listing' }
];

// Create the data file the first time the server starts.
function readRequests() {
  fs.mkdirSync(dataFolder, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(sampleRequests, null, 2));
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveRequests(requests) {
  fs.writeFileSync(dataFile, JSON.stringify(requests, null, 2));
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', part => {
      body += part;
      if (body.length > 20_000) reject(new Error('The form is too large.'));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Please send valid form data.')); }
    });
    request.on('error', reject);
  });
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function handleApi(request, response, url) {
  if (url.pathname === '/api/requests' && request.method === 'GET') {
    return sendJson(response, 200, readRequests());
  }

  if (url.pathname === '/api/requests' && request.method === 'POST') {
    return readBody(request).then(form => {
      const type = form.type === 'Tutor' ? 'Tutor' : form.type === 'Material' ? 'Material' : '';
      const title = cleanText(form.title, 80);
      const place = cleanText(form.place, 70);
      if (!type || !title || !place) {
        return sendJson(response, 400, { error: 'Please add a title, type and city or region.' });
      }

      const newRequest = {
        id: `r${Date.now()}`,
        type,
        title,
        place,
        detail: cleanText(form.detail, 400),
        category: cleanText(form.category, 50) || 'Other',
        date: 'Posted just now',
        status: 'Open',
        person: type === 'Tutor' && form.offer ? 'Volunteer offer' : type === 'Material' && form.offer ? 'Donor offer' : 'Community request'
      };

      const requests = readRequests();
      requests.unshift(newRequest);
      saveRequests(requests);
      return sendJson(response, 201, newRequest);
    }).catch(error => sendJson(response, 400, { error: error.message }));
  }

  const statusMatch = url.pathname.match(/^\/api\/requests\/([^/]+)\/status$/);
  if (statusMatch && request.method === 'PATCH') {
    return readBody(request).then(form => {
      if (!['Open', 'Accepted', 'Completed'].includes(form.status)) {
        return sendJson(response, 400, { error: 'That status is not available.' });
      }
      const requests = readRequests();
      const listing = requests.find(item => item.id === statusMatch[1]);
      if (!listing) return sendJson(response, 404, { error: 'Listing not found.' });
      listing.status = form.status;
      saveRequests(requests);
      return sendJson(response, 200, listing);
    }).catch(error => sendJson(response, 400, { error: error.message }));
  }

  if (url.pathname === '/api/reset' && request.method === 'POST') {
    const requests = sampleRequests.map(item => ({ ...item }));
    saveRequests(requests);
    return sendJson(response, 200, requests);
  }

  sendJson(response, 404, { error: 'API route not found.' });
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function servePage(response, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).slice(1);
  const filePath = path.resolve(siteFolder, relativePath);
  // The JSON data is for the server only, so never serve it as a public page.
  if (filePath === dataFolder || filePath.startsWith(dataFolder + path.sep)) {
    response.writeHead(404);
    return response.end('Page not found.');
  }
  if (!filePath.startsWith(siteFolder + path.sep) && filePath !== path.join(siteFolder, 'index.html')) {
    response.writeHead(403);
    return response.end('Not allowed.');
  }
  fs.readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(404);
      return response.end('Page not found.');
    }
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(file);
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(request, response, url);
  servePage(response, url.pathname);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`EduBridge is ready at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop the server.');
});
