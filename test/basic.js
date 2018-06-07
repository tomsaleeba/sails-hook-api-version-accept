const _ = require('@sailshq/lodash')
const Sails = require('sails').constructor
require('should')
require('should-http')

describe('Basic tests ::', () => {

  var sails

  before(done => {
    (new Sails()).load({
      hooks: {
        'api-version-accept': require('../'),
        grunt: false,
        views: false,
        cors: false,
        csrf: false,
        i18n: false,
        pubsub: false,
        session: false,
      },
      globals: {
        _: _,
        models: true,
        async: false,
        sails: false,
      },
      log: {level: 'error'},
      orm: {
        moduleDefinitions: {
          models: {
            'user': {
              attributes: {
                'name': 'string',
                'phone': 'string',
                'address': 'string',
              },
              versionConfig: {
                versions: ['v1', 'v2', 'v3'],
                vendorPrefix: 'vnd.techotom.test.user'
              }
            }
          }
        }
      },
      helpers: {
        moduleDefinitions: {
          'v2userfind': {
            fn: async function (_, exits) {
              const rawResult = await user.find()
              const mappedToV2 = rawResult.reduce((accum, curr) => {
                delete curr.address
                accum.push(curr)
                return accum
              }, [])
              return exits.success(mappedToV2)
            }
          },
          'v1userfind': {
            fn: async function (_, exits) {
              const rawResult = await user.find()
              const mappedToV1 = rawResult.reduce((accum, curr) => {
                delete curr.address
                delete curr.phone
                accum.push(curr)
                return accum
              }, [])
              return exits.success(mappedToV1)
            }
          },
        }
      },
      models: {
        migrate: 'drop',
        attributes: {
          id: { type: 'number', autoIncrement: true}
        }
      },
    },(err, _sails) => {
      if (err) {return done(err)}
      sails = _sails
      createUserInstances(sails)
      return done()
    })
  })

  after(done => {
    if (sails) {
      return sails.lower(done)
    }
    return done()
  })

  it('should succeed for a Find action that Accepts anything', done => {
    sails.request({
      url: '/user',
      method: 'GET',
      headers: {
        'Accept': '*/*'
      }
    }, (err, res, bodyStr) => {
      if (err) {return done(err)}
      const body = JSON.parse(bodyStr)
      body.should.be.Array().with.lengthOf(2)
      res.should.have.contentType('application/vnd.techotom.test.user.v3+json')
      done()
    })
  })

  it('should succeed for a Find action that Accepts v2', done => {
    sails.request({
      url: '/user',
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.techotom.test.user.v2+json'
      }
    }, (err, res, bodyStr) => {
      if (err) {return done(err)}
      const body = JSON.parse(bodyStr)
      body.should.be.Array().with.lengthOf(2)
      res.headers.should.have.property('Content-type', 'application/vnd.techotom.test.user.v2+json')
      const isAnyAddresses = _.some(body, 'address')
      isAnyAddresses.should.not.be.true('v2 responses should have the address field removed')
      done()
    })
  })

  it('should succeed for a Find action that Accepts v1', done => {
    sails.request({
      url: '/user',
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.techotom.test.user.v1+json'
      }
    }, (err, res, bodyStr) => {
      if (err) {return done(err)}
      const body = JSON.parse(bodyStr)
      body.should.be.Array().with.lengthOf(2)
      res.headers.should.have.property('Content-type', 'application/vnd.techotom.test.user.v1+json')
      const isAnyAddresses = _.some(body, 'address')
      isAnyAddresses.should.not.be.true('v1 responses should have the address field removed')
      const isAnyPhones = _.some(body, 'phone')
      isAnyPhones.should.not.be.true('v1 responses should have the phone field removed')
      done()
    })
  })
})

function createUserInstances (sails) {
  sails.request('GET /user/create?name=Carl&address=123%20Fake%20St&phone=1111', (err) => {
    if (err) {throw err}
  })
  sails.request('GET /user/create?name=Lenny&address=456%20Blah%20St&phone=2222', (err) => {
    if (err) {throw err}
  })
}
