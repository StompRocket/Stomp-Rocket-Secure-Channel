#!/usr/bin/env node

const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const inquirer = require('inquirer')
const Configstore = require('configstore')
const CLI = require('clui')
const Spinner = CLI.Spinner
const conf = new Configstore('srsc')
const ip = require('ip')
const getIP = require('external-ip')()
var net = require('net');
const Telnet = require('telnet-client')
var CryptoJS = require("crypto-js");

var firebase = require('firebase')
var config = {
  apiKey: 'AIzaSyAES199RjllPEj-MBmnN4mVULzVfMuv7R8',
  authDomain: 'securechat-f02ab.firebaseapp.com',
  databaseURL: 'https://securechat-f02ab.firebaseio.com',
  projectId: 'securechat-f02ab',
  storageBucket: 'securechat-f02ab.appspot.com',
  messagingSenderId: '738366227852'
}
firebase.initializeApp(config)
String.prototype.hashCode = function() {
  var hash = 0,
    i, chr
  if (this.length === 0) return hash
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

clear()
console.log(
  chalk.yellow(
    figlet.textSync('SRSC', {
      horizontalLayout: 'full'
    })
  ))
const loginQuestions = [{
    name: 'username',
    type: 'input',
    message: 'Enter your SRSC e-mail address:',
    validate: function(value) {
      if (value.length) {
        return true
      } else {
        return 'Please enter your username or e-mail address.'
      }
    }
  },
  {
    name: 'password',
    type: 'password',
    message: 'Enter your password:',
    validate: function(value) {
      if (value.length) {
        return true
      } else {
        return 'Please enter your password.'
      }
    }
  }
]

function uidGeneration() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function encrypt(message, key) {
  return CryptoJS.AES.encrypt(message.toString(), key.toString()).toString()
}

function decrypt(message, key) {
  var bytes = CryptoJS.AES.decrypt(message.toString(), key.toString());
  return bytes.toString(CryptoJS.enc.Utf8);
}

const create = async () => {
  clear()
  console.log('creating...')
  getIP((err, gip) => {
    if (err) {
      // every service in the list has failed
      console.log(chalk.red(err))
      throw err
    }
    const ipHash = String(gip).hashCode()
    console.log('your ip:', chalk.green(gip))
    console.log('your local ip:', chalk.green(ip.address()))
    console.log('your ip hash:', chalk.green(ipHash));
    const id = uidGeneration() + ipHash
    console.log('connection id:', chalk.green(id))
    console.log(`Give your connection id to the person you want to connect to. Tell them to login to SRSC and choose join. Then have them type in the code.`);
    console.log('After that have them enter your ip.');
    var net = require('net');
    var stdin = process.stdin;
    var server = net.createServer(function(conn) {

      stdin.resume();
      var clientid = null
      conn.setEncoding('utf8');
      console.log('new connection!');
      stdin.on('data', function(chunk) {
        conn.write(encrypt(chunk.toString(), id));
      });
      conn.on('data', function(data) {

        data = data.replace('\r\n', '');
        var decryptedData = decrypt(data, id)
        //console.log(data, decryptedData);
        if (!clientid) {
          clientid = decryptedData
          if (clientid == id) {
            conn.write(encrypt('Welcome', id))
            console.log(chalk.green('Client Verified √'));
          } else {
            console.log(chalk.red('Warning! client not verified!!'));
            conn.write('impopster')
            conn.destroy()
            console.log(chalk.yellow('unverified client kicked'));
          }
        } else {

          console.log('client: ' + chalk.green(decryptedData.replace('\r\n', '')));

        }
      });


      conn.on('close', function() {
        console.log('user left');
      });
    });

    server.listen(9000, function() {
      console.log(chalk.green('server running'));
    });
  })

}


const join = async () => {
  const questions = [{
      type: 'input',
      name: 'id',
      message: 'Enter the connection id:',
      default: null,
      validate: function(value) {
        if (value.length) {
          return true
        } else {
          return 'Please enter a connection id.'
        }
      }
    },
    {
      type: 'input',
      name: 'ip',
      default: null,
      message: 'Please enter the ip of the person you want to connect to:',
      validate: function(value) {
        if (value.length) {
          return true
        } else {
          return 'Please enter an ip.'
        }
      }
    }
  ];
  const connectionDetails = await inquirer.prompt(questions);
  //console.log(connectionDetails);
  var connect = require('net');
  var stdin = process.stdin;
  stdin.resume();
  var client = connect.connect('9000', connectionDetails.ip);
  client.on('data', function(data) {
    var decryptedData = decrypt(data, connectionDetails.id).replace('\r\n', '')
    console.log('server: ' + chalk.green(decryptedData));
    stdin.on('data', function(chunk) {
      client.write(encrypt(chunk.toString(), connectionDetails.id));
    });
  }).on('connect', function() {
    console.log('connecting');
    let enc = encrypt(connectionDetails.id, connectionDetails.id)
    client.write(enc);
  }).on('end', function() {
    console.log('Disconnected');
    process.exit()
  });


}
const homeWindow = async () => {
  const questions = [{
    type: 'list',
    name: 'joinOrCreate',
    message: 'Would you like to join a channel or create one?',
    choices: ['join', 'create'],
    default: 'join'
  }]
  const choice = await inquirer.prompt(questions)
  //console.log(choice.joinOrCreate)
  if (choice.joinOrCreate == 'create') {
    create()
  } else {
    join()
  }
}

const run = async () => {
  const credentials = conf.get('credentials') || await inquirer.prompt(loginQuestions)
  const status = new Spinner('Authenticating you, please wait...')
  status.start()
  firebase.auth().signInWithEmailAndPassword(credentials.username, credentials.password).then(() => {
    status.stop()
    clear()
    conf.set('credentials', credentials)
    console.log(chalk.green('welcome ' + credentials.username))
    homeWindow()
  }).catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code
    var errorMessage = error.message
    status.stop()
    clear()
    console.log(chalk.red(errorMessage))
    run()
    // ...
  })
}

run()