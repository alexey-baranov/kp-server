require 'serverspec'
set :backend, :exec

RSpec.configure do |c|
  c.before :all do
    c.path = '/sbin:/usr/sbin:/bin:/usr/bin'
  end
end

describe package('mysecureshell') do
  it { should be_installed }
end

describe service('mysecureshell') do
  it { should be_enabled }
  it { should be_running }
end
