const path = require('node:path')
const express = require('express')
const session = require('express-session')

const defaultEnv = {
  NODE_ENV: 'test',
  COMPANION_PORT: 3020,
  COMPANION_DOMAIN: 'localhost:3020',
  COMPANION_SELF_ENDPOINT: 'localhost:3020',
  COMPANION_HIDE_METRICS: 'false',
  COMPANION_HIDE_WELCOME: 'false',

  COMPANION_STREAMING_UPLOAD: 'true',
  COMPANION_ALLOW_LOCAL_URLS : 'false',

  COMPANION_PROTOCOL: 'http',
  COMPANION_DATADIR: path.join(__dirname, 'output'),
  COMPANION_SECRET: 'secret',

  COMPANION_DROPBOX_KEY: 'dropbox_key',
  COMPANION_DROPBOX_SECRET: 'dropbox_secret',

  COMPANION_BOX_KEY: 'box_key',
  COMPANION_BOX_SECRET: 'box_secret',

  COMPANION_GOOGLE_KEY: 'google_key',
  COMPANION_GOOGLE_SECRET: 'google_secret',

  COMPANION_INSTAGRAM_KEY: 'instagram_key',
  COMPANION_INSTAGRAM_SECRET: 'instagram_secret',

  COMPANION_ZOOM_KEY: 'zoom_key',
  COMPANION_ZOOM_SECRET: 'zoom_secret',
  COMPANION_ZOOM_VERIFICATION_TOKEN: 'zoom_verfication_token',

  COMPANION_PATH: '',

  COMPANION_PERIODIC_PING_URLS: '',

  COMPANION_CLIENT_SOCKET_CONNECT_TIMEOUT: '',
}

function updateEnv (env) {
  Object.keys(env).forEach((key) => {
    process.env[key] = env[key]
  })
}

module.exports.setDefaultEnv = () => updateEnv(defaultEnv)

module.exports.getServer = (extraEnv) => {
  const env = {
    ...defaultEnv,
    ...extraEnv,
  }

  updateEnv(env)

  // companion stores certain global state like emitter, metrics, logger (frozen object), so we need to reset modules
  // todo rewrite companion to not use global state
  // https://github.com/transloadit/uppy/issues/3284
  Object.keys(require.cache).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(require.cache[key], 'resetFn')) {
      const Module = require('node:module') // eslint-disable-line global-require
      const { resetFn } = require.cache[key]
      require.cache[key] = new Module(key, require.cache[key].parent)
      Object.defineProperties(require.cache[key], {
        exports: {
          __proto__:null,
          value: resetFn(),
        },
        resetFn: { __proto__: null, value: resetFn },
      })
    } else {
      delete require.cache[key]
    }
  })
  const standalone = require('../src/standalone')
  const authServer = express()

  authServer.use(session({ secret: 'grant', resave: true, saveUninitialized: true }))
  authServer.all('*/callback', (req, res, next) => {
    req.session.grant = {
      response: { access_token: 'fake token' },
    }
    next()
  })
  authServer.all(['*/send-token', '*/redirect'], (req, res, next) => {
    req.session.grant = { dynamic: { state: req.query.state || 'non-empty-value' } }
    next()
  })

  const { app } = standalone()
  authServer.use(app)
  return authServer
}
