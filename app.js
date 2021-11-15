import fetch from 'node-fetch';
import cheerio from 'cheerio';
import fs from 'fs';
import { log } from 'console';

const rootDir = './story';
const linkStory = 'http://www.nettruyenpro.com/truyen-tranh/funouhan-10657';
const linkChap = 'http://www.nettruyenpro.com/truyen-tranh/funouhan/chap-37/789687';
const numberChap = 6;

function parseLinkForStory(linkStory) {
  return new Promise(async (resolve, reject) => {
    const attackOneStory = [];
    try {
      // get content html nettruyen
      const content = await (await fetch(linkStory)).text();
      // init dom virtual by cheerio
      const $ = cheerio.load(content);
      // access node a
      const nodes = $('li.row div.chapter a[data-id]');
      // loop nodes image get attributes src of image
      for(let node of nodes) {
        if(String(node.attribs.href).includes('http') || String(node.attribs.href).includes('https')) {
          attackOneStory.push({ chap: node.children[0].data, link: node.attribs.href });
        }else {
          attackOneStory.push({ chap: node.children[0].data, link: `http:${node.attribs.href}` });
        }
      }
      // complete problem
      resolve(attackOneStory);
    } catch (error) {
      // failure problem
      reject('Trang truyện này không thể crawl => (link chap) ' + new Error(error));
    }
  })
}

function parseLinkForChap(linkChap) {
  return new Promise(async (resolve, reject) => {
    const attackOneChapter = [];
    try {
      // get content html nettruyen
      const content = await (await fetch(linkChap)).text();
      // init dom virtual by cheerio
      const $ = cheerio.load(content);
      // access node image
      const nodes = $('.page-chapter img');
      // loop nodes image get attributes src of image
      for(let node of nodes) {
        if(String(node.attribs.src).includes('http') || String(node.attribs.src).includes('https')) {
          attackOneChapter.push(node.attribs.src);
        }else {
          attackOneChapter.push(`http:${node.attribs.src}`);
        }
      }
      // complete problem
      resolve(attackOneChapter)
    } catch (error) {
      // failure problem
      reject('Trang truyện này không thể crawl => (ảnh) ' + new Error(error));
    }
  })
}

function downloadImage(link, path) {
  return new Promise(async (resolve, reject) => {
    try {
      const shift = fs.createWriteStream(path);
      const getResponse = await fetch(link, { headers: { 'Referer': 'http://www.nettruyenpro.com/' } });
      const arraybuffer = await getResponse.arrayBuffer();
      const buffer = new Uint8Array(arraybuffer);
      shift.on('finish', function() {
        resolve(true);
      })
      shift.write(buffer);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  })
}

async function downloadForChap(chap) {
  return new Promise(async (resolve, reject) => {
    const promiseForChap = [];
    try {
      let index = 0;
      const path = `${rootDir}/chapter-${index}`;
      const checkPath = fs.existsSync(path);
      if(!checkPath) {
        fs.mkdirSync(path, { recursive: true });
      }
      for(let item of chap['data-image']) {
        promiseForChap.push(downloadImage(item, `${path}/index-${index}.jpg`));
        index++;
      }
      const result = await Promise.all(promiseForChap);
      if(result) {
        resolve(true); }
    } catch (error) {
      reject(error);
    }
  })
}

async function handleAll(linkStory, numberChap) {
  try {
    const promiseForChap = [];
    const promiseForPic = [];
    const stateLinkStory = await parseLinkForStory(linkStory);
    if(stateLinkStory) {
      console.log('Clone xong chap của truyện ^^!');
    }
    for(let chap of stateLinkStory) {
      promiseForChap.push(parseLinkForChap(chap.link));
    }
    const picForChap = await Promise.all(promiseForChap)
    stateLinkStory.forEach((ele, index) => {
      stateLinkStory[index]['data-image'] = picForChap[index];
    });
    if(stateLinkStory) {
      console.log('Clone xong link ảnh của truyện ^^!');
    }
    // action download by number chap
    for(let index = 0; index < numberChap; index++) {
      promiseForPic.push(downloadForChap(stateLinkStory[index]));
    }
    const result = await Promise.all(promiseForPic)
    if(result) {
      console.log('Clone xong ^^!');
    }
  } catch (error) {
    console.log(error)
  }
}

async function downloadChap(linkChap) {
  let dataImage = await parseLinkForChap(linkChap);
  downloadForChap({ 'data-image': dataImage, chap: 'mission' });
}

console.time('test');

// handleAll(linkStory, numberChap);
downloadChap(linkChap);

console.timeEnd('test');
