# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require "rubocop/rake_task"
require "scss_lint/rake_task"

require File.expand_path("../config/application", __FILE__)

RuboCop::RakeTask.new
SCSSLint::RakeTask.new

Rails.application.load_tasks

task default: [:spec, :rubocop, :scss_lint]
