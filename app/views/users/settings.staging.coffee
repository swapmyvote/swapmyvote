Path = require('path')
http = require('http')
http.globalAgent.maxSockets = 300
env = process.env.NODE_ENV.toLowerCase()
 
module.exports =
	s3:
		key: 'AKIAIJX3RNZFDHUQHRYA'
		secret: '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'
		bucketName : "sl-mongo-backups-staging"
		 
	mongo:
		databaseName: "sharelatex-staging"