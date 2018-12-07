const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');

class Config {

  constructor() {
    this.appName = this.isDef(process.env.APP_NAME) ? process.env.APP_NAME : uuid();
    this.env = !this.isValidEnv(process.env.NODE_ENV) ? 'default' : process.env.NODE_ENV;
    this.ENC_KEY = process.env.ENC_KEY;
    this.root = `..${__dirname}`;
    if (!this.isPlainExists() && !this.isConfigExists()) {
      throw new Error('Configurations files are not found');
    }

    if (this.isProd() && (this.ENC_KEY === undefined || this.ENC_KEY.length === 0)) {
      throw new Error('Encryption key must be initiliazed in production');
    }

    if (this.isProd() && this.isPlainExists()) {
      this.encConfig();
    }
    this.config = require('config');
  }

  isProd() {
    return this.env === 'prod';
  }

  isDef(v) {
    return v !== undefined && v.trim().length !== 0;
  }

  isValidEnv(env) {
    return env === 'prod' || env === 'dev';
  }

  encConfig() {
    const configFiles = fs.readdirSync(this.getPath(true));
    for (const file of configFiles) {
      const tmpConfPath = `${this.getPath(true)}${file}`;
      const conf = JSON.parse(fs.readFileSync(tmpConfPath));
      const tmpEncConfig = this.encObj(conf);
      fs.writeFileSync(`${this.getPath(false)}${file}`, JSON.stringify(tmpEncConfig));
    }
    this.removePlainConfig(true);
    return true;
  }

  encObj(obj) {
    const tmpEnc = {};
    for (const key in obj) {
      if (!Array.isArray(obj[key]) && typeof obj[key] === 'object') {
        tmpEnc[key] = this.encObj(obj[key], {});
      } else if (Array.isArray(obj[key])) {
        const tmpArr = [];
        for (let i = 0; i < obj[key].length; i += 1) {
          if (typeof obj[key][i] === 'object') {
            tmpArr.push(this.encObj(obj[key][i]));
          } else {
            tmpArr.push(this.enc(obj[key][i]));
          }
        }
        tmpEnc[key] = tmpArr;
      } else {
        tmpEnc[key] = this.enc(obj[key]);
      }
    }
    return tmpEnc;
  }

  decObj(obj) {
    const tmpEnc = {};
    for (const key in obj) {
      if (!Array.isArray(obj[key]) && typeof obj[key] === 'object') {
        tmpEnc[key] = this.decObj(obj[key], {});
      } else if (Array.isArray(obj[key])) {
        const tmpArr = [];
        for (let i = 0; i < obj[key].length; i += 1) {
          if (typeof obj[key][i] === 'object') {
            tmpArr.push(this.decObj(obj[key][i]));
          } else {
            tmpArr.push(this.dec(obj[key][i]));
          }
        }
        tmpEnc[key] = tmpArr;
      } else {
        tmpEnc[key] = this.dec(obj[key]);
      }
    }
    return tmpEnc;
  }

  enc(v) {
    const cipher = crypto.createCipher('aes192', this.ENC_KEY);
    let encrypted = cipher.update(`${v}`, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  dec(v) {
    const decipher = crypto.createDecipher('aes192', this.ENC_KEY);
    let decrypted = decipher.update(v, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  getPath(plain = false) {
    let tmp = `${path.resolve(__dirname, '../')}/config/`;
    if (plain) tmp += 'plain/';
    return tmp;
  }

  isConfigExists() {
    return fs.existsSync(`${this.getPath()}${this.env}.json`);
  }

  isPlainExists() {
    return fs.existsSync(`${this.getPath(true)}${this.env}.json`);
  }

  removePlainConfig(all = false) {
    const tmpPath = this.getPath(true);
    let files = [];
    if (all) {
      files = fs.readdirSync(tmpPath)
        .map(file => `${tmpPath}${file}`);
    } else if (fs.existsSync(`${tmpPath}${this.env}.json`)) {
      files = [`${tmpPath}${this.env}.json`];
    }

    return files.map(file => fs.unlinkSync(file));
  }


  getEencConfigProxy() {
    return new Proxy(this.config, {
      get: (target, name) => {
        if (name === 'appName') {
          return this.appName;
        }

        let tmp = target[name];
        if (typeof tmp === 'undefined') {
          return tmp;
        }
        if (Array.isArray(tmp)) {
          tmp = this.decObj({ [name]: target[name] });
          return tmp[name];
        }
        if (typeof tmp === 'object') {
          return this.decObj(tmp);
        }
        return this.dec(tmp);
      },
    });
  }

  getConfigProxy() {
    return new Proxy(this.config, {
      get: (target, name) => {
        if (name === 'appName') {
          return this.appName;
        }
        return this.config[name];
      },
    });
  }

}
function getConfig() {
  const conf = new Config();
  if (process.env.NODE_ENV === 'prod') {
    return conf.getEencConfigProxy();
  }
  return conf.getConfigProxy();
}

const config = getConfig();
module.exports = config;
