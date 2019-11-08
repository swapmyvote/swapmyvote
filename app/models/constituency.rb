# frozen_string_literal: true

class Constituency < ApplicationRecord
  has_many :polls
end
