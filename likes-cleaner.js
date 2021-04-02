'use strict'

const chalk = require('chalk')
const Twitter = require('twitter')
const jsonfile = require('jsonfile')
const config = require('./config')

function getLikes () {
  global.window = { YTD: { like: { } } }
  require(config.like_path)
  return window.YTD.like.part0.map(object => object.like)
}

const logFile = './logs/likes-cleaner.log.json'
let log
try {
  log = require(logFile)
} catch (e) {
  console.log(chalk.cyan('No log file, starting a fresh delete cycle.'))
  log = []
}

const client = new Twitter({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token_key: config.access_token_key,
  access_token_secret: config.access_token_secret
})

main()

function main () {
  const rawLikes = getLikes()

  const likes = rawLikes.filter(t => {
    const hasId = !isNaN(parseInt(t.tweetId))
    return hasId
  })

  if (!likes || !likes.length) {
    return console.log(chalk.green('No more likes to delete!'))
  }

  console.log(chalk.green('Starting likes cleaner'))
  deleteLike(likes, 0)
}

function deleteLike (likes, i) {
  let next = config.callsInterval
  let remaining = 0

  client.post('favorites/destroy', { id: likes[i].tweetId }, function (err, t, res) {
    remaining = parseInt(res.headers['x-rate-limit-remaining'])

    if (!isNaN(remaining) && remaining === 0) {
      console.log(chalk.cyan('Waiting'))
      next = parseInt(res.headers['x-rate-limit-reset']) - Date.now()
    } else {
      if (err) {
        console.log(chalk.yellow(JSON.stringify(err)))
      } else {
        log.push(likes[i])
        console.log(chalk.green(`Deleted -> ${likes[i].tweetId} | ${likes[i].fullText}`))
      }
    }

    jsonfile.writeFile(logFile, log, { spaces: 2 }, function (err) {
      if (err) {
        return console.log(chalk.red('ERROR WRITING JSON!'))
      }

      if (i + 1 === likes.length) {
        return console.log(chalk.green('Done!'))
      }

      console.log(chalk.green(`Next call in ${next}ms`))
      setTimeout(function () {
        deleteLike(likes, i + 1)
      }, next)
    })
  })
}
