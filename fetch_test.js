import https from 'https';
https.get('https://touming.vercel.app/assets/photo1-BrBpB9yH.png', (res) => {
  let data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => {
    let buf = Buffer.concat(data);
    console.log("Size:", buf.length);
    console.log("Magic:", buf.subarray(0, 10).toString('hex'));
    console.log("String:", buf.subarray(0, 200).toString('utf-8'));
  });
});
