var request = require('request')
var Promise = require('promise')

exports.luisApi = function (endpoint, query) {
  return new Promise(
        function (resolve, reject) {
          var requestData = {
            uri: endpoint + query,
            qs: { q: query }
          }

          request.get(requestData, function (err, response, body) {
            if (err) {
              reject(err)
            } else if (response.statusCode !== 200) {
              reject(body)
            } else {
              resolve(body)
            }
          })
        }
    )
}
