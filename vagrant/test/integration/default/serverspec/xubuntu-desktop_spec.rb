require 'serverspec'
set :backend, :exec

RSpec.configure do |c|
  c.before :all do
    c.path = '/sbin:/usr/sbin:/bin:/usr/bin'
  end
end

describe package('xubuntu-desktop') do
  it { should be_installed }
end

describe service('lightdm') do
  it { should_not be_running }
end
