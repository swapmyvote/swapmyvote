module.exports = (grunt) ->
	grunt.loadNpmTasks "grunt-contrib-jade"
	grunt.loadNpmTasks "grunt-contrib-less"
	grunt.loadNpmTasks "grunt-contrib-watch"
	
	grunt.initConfig
		jade:
			compile:
				files:
					"public/html/index.html": "public/jade/index.jade"
					
		less:
			compile:
				files:
					"public/css/style.css": "public/less/style.less"
					
		watch:
			jade:
				files: "public/jade/*"
				tasks: ["jade"]
			less:
				files: "public/less/*"
				tasks: ["less"]