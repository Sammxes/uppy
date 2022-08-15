function mock (package, replacer) {
  const actualPath = require.resolve(package)
  if (arguments.length === 1) {
    // eslint-disable-next-line import/no-dynamic-require,global-require
    require.cache[actualPath] = require(`../__mocks__/${package}`)
  } else {
    const Module = require('node:module') // eslint-disable-line global-require
    require.cache[actualPath] = new Module(actualPath, module)
    Object.defineProperties(require.cache[actualPath], {
      exports: {
        __proto__: null,
        value: replacer(),
      },
      resetFn: { __proto__: null, value: replacer },
    })
  }
}
mock('../../src/server/helpers/jwt', () => {
  return {
    generateToken: () => {},
    verifyToken: () => {},
    generateEncryptedToken: () => {
      return 'dummy token'
    },
    verifyEncryptedToken: () => {
      return { payload: '' }
    },
    addToCookies: () => {},
    removeFromCookies: () => {},
  }
})

const { test, describe } = require('test')
const expect = require('expect').default
const request = require('supertest')
const { getServer } = require('../mockserver')
// the order in which getServer is called matters because, once an env is passed,
// it won't be overridden when you call getServer without an argument
const serverWithFixedOauth = getServer()
const serverWithDynamicOauth = getServer({ COMPANION_DROPBOX_KEYS_ENDPOINT: 'http://localhost:1000/endpoint' })

describe('handle preauth endpoint', () => {
  test('happy path', () => {
    return request(serverWithDynamicOauth)
      .post('/dropbox/preauth')
      .set('Content-Type', 'application/json')
      .send({
        params: 'param value',
      })
      .expect(200)
      // see jwt.generateEncryptedToken mock above
      .then((res) => expect(res.body.token).toBe('dummy token'))
  })

  test('preauth request without params in body', () => {
    return request(serverWithDynamicOauth)
      .post('/dropbox/preauth')
      .set('Content-Type', 'application/json')
      .send({
        notParams: 'value',
      })
      .expect(400)
  })

  test('providers with dynamic credentials disabled', () => {
    return request(serverWithDynamicOauth)
      .post('/drive/preauth')
      .set('Content-Type', 'application/json')
      .send({
        params: 'param value',
      })
      .expect(501)
  })

  test('server with dynamic credentials disabled', () => {
    return request(serverWithFixedOauth)
      .post('/dropbox/preauth')
      .set('Content-Type', 'application/json')
      .send({
        params: 'param value',
      })
      .expect(501)
  })
})
