# frozen_string_literal: true

# The legacy packs in app/javascript/packs are still built by webpack 4, which
# hashes with md4 in several hardcoded places. OpenSSL 3 (bundled with Node >=
# 17) dropped md4, so `rake assets:precompile` dies with
# "error:0308010C:digital envelope routines::unsupported" on any modern Node,
# including the one Heroku's nodejs buildpack installs. Setting
# output.hashFunction is not enough, because the plugins bypass it, so the node
# process needs the legacy provider switched back on.
#
# Scoped to the webpack subprocess, so the Vite build and the Rails server do
# not inherit it. Delete this file once the packs are ported to React and the
# webpacker gem is dropped.
if defined?(Webpacker::Compiler)
  node_options = ENV.fetch("NODE_OPTIONS", "")

  unless node_options.include?("--openssl-legacy-provider")
    Webpacker::Compiler.env["NODE_OPTIONS"] =
      "#{node_options} --openssl-legacy-provider".strip
  end
end
