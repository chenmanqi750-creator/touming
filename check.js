import fs from 'fs';
['photo1.png', 'photo2.png', 'photo3.png', 'photo4.png', 'raincoat.png'].forEach(file => {
  const p = `./src/assets/images/${file}`;
  const stat = fs.statSync(p);
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(p, 'r');
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  console.log(`${file}: size ${stat.size}, magic ${buf.toString('hex')}`);
});
