const HttpRequest = async (url, method, body, callback) => { 
    console.log(`서버로 전송될 파라미터: ${body}`)
   const response = await fetch(url, {
       method: method,
       headers: { 'Content-Type' : 'application/json'},
       body: body
   });
   callback(await response.json());
    
}

module.exports = HttpRequest;