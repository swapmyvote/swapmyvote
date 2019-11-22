require "singleton"
require "forwardable"

class NameRedactor
  include Singleton
  extend SingleForwardable

  def_delegator :instance, :redact

  def redact(name)
    return nil unless name

    first, second, _rest = split_names(strip_leading_blanks(name))
    [first, first_grapheme(second)].compact.join(" ")
  end

  private

  def split_names(str)
    str.split(/[[:space:]]+/)
  end

  def first_grapheme(str)
    return nil unless str

    str.each_grapheme_cluster.first
  end

  def strip_leading_blanks(str)
    str.sub(/\A[[:space:]]+/, "")
  end
end
