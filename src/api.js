// these need to occur after dotenv
var express = require('express')
var bodyParser = require('body-parser')
var debug = require('debug')('pdf:api')
var error = require('./error')
var childProcess = require('child_process')

function createApi(createQueue, options = {}) {
  var api = express()
  api.use(bodyParser.json())

  var token = options.token

  if (!token) {
    debug('Warning: The server should be protected using a token.')
  }

  api.post('/', function(req, res) {
    var queue = createQueue()
    var authHeader = req.get('Authorization')

    if (token && (!authHeader || authHeader.replace(/Bearer (.*)$/i, '$1') !== token)) {
      res.status(401).json(error.createErrorResponse(error.ERROR_INVALID_TOKEN))
      return
    }
    
    let jobs = Array.isArray(req.body)
      ? req.body
      : [ req.body ]

    let response = []
    for (let job of jobs) {
      queue
        .addToQueue(
          {
            url: job.url,
            meta: job.meta || {}
          }
        )
        .then(function (rs) {
          queue.close()

          if (error.isError(rs)) {
            response.push({
              status: 422,
              response: rs
            })
            return
          }

          if (options.postPushCommand && options.postPushCommand.length > 0) {
            childProcess.spawn.apply(null, options.postPushCommand)
          }
    
          response.push({
            status: 201,
            response: rs
          })
        })
     }
     res.status(201).json(response)
  })

  return api
}

module.exports = createApi
