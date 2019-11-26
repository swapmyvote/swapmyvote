require "rails_helper"

RSpec.describe SentEmail, type: :model do
  specify { expect(subject).to respond_to(:user)}
  specify { expect(subject).to respond_to(:template)}
end
