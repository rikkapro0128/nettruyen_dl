import fetch from 'node-fetch';
import cheerio from 'cheerio';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util'

const rootDir = './story-' + String(Date.now());
const linkStory = 'http://www.nettruyenpro.com/truyen-tranh/trong-sinh-tro-thanh-mon-trang-mieng-cua-tong-tai-ma-ca-rong-48023';
// const linkChap = 'http://www.nettruyenpro.com/truyen-tranh/anh-dao-tam-doc/chap-10/743453';
// const numberChap = 6;

function parseLinkForStory(linkStory) {
  return new Promise(async (resolve, reject) => {
    const attackOneStory = [];
    try {
      // get content html nettruyen
      const content = await (await fetch(linkStory, { headers: 
        { 
          'Referer': 'http://www.nettruyenpro.com/',
          // 'Referer': 'https://www.nettruyenonline.com/',
          'Connection': 'keep-alive'
        }
      })).text();
      // init dom virtual by cheerio
      const $ = cheerio.load(content);
      // access node a
      const nodes = $('li.row div.chapter a');
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
    try {
      const attackOneChapter = [];
      // get content html nettruyen
      const response = await fetch(String(linkChap, { headers: { 'Referer': 'http://www.nettruyenpro.com/', 'Connection': 'keep-alive' } }));
      const body = await response.text();
      // init dom virtual by cheerio
      const $ = cheerio.load(body);
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
      const response = await fetch(link, { headers: { 
        'Referer': 'http://www.nettruyenpro.com/',
        'Connection': 'keep-alive',
        'accept-encoding': 'gzip, deflate, br',
        'authority': 'blogger.googleusercontent.com'
      }});
      if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
      const streamPipeline = promisify(pipeline);
      await streamPipeline(response.body, fs.createWriteStream(path))
      .then(() => {
        resolve();
      })
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
      const path = `${rootDir}/${chap.chap}`;
      const checkPath = fs.existsSync(path);
      if(!checkPath) {
        fs.mkdirSync(path, { recursive: true });
      }
      for await(let item of chap['data-image']) {
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

async function handleAll(linkStory) {
  try {
    console.time('Time crawl');
    const stateLinkStory = await parseLinkForStory(linkStory);
    // console.log(stateLinkStory)
    console.timeEnd('Time crawl');
    console.log('<<<<<<<<<< --- Đã crawl xong dữ liệu để tải xuống --- >>>>>>>>>>');
    let index = 0;
    for (const chap of stateLinkStory) {
      downloadChap(chap.link, index, chap.chap);
      index++;
    }
  } catch (error) {
    console.log(error)
  }
}

async function downloadChap(linkChap, index, name) {
  let dataImage = await parseLinkForChap(linkChap);
  await downloadForChap({ 'data-image': dataImage, chap: 'mission-' + (index + 1) });
  console.log("<<<<<<<<<< --- Clone xong " + name + " --- >>>>>>>>>>");
}

handleAll(linkStory);
