# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

require "rubocop/rake_task"
require "scss_lint/rake_task"
require "haml_lint/rake_task"

require File.expand_path("../config/application", __FILE__)

RuboCop::RakeTask.new do |task|
  task.requires << "rubocop-rails"
  task.requires << "rubocop-rspec"
end

SCSSLint::RakeTask.new
HamlLint::RakeTask.new

Rails.application.load_tasks

task lint: [:rubocop, :scss_lint, :haml_lint]

task default: [:spec, :lint]
