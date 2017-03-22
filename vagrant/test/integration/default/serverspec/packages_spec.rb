require 'serverspec'
set :backend, :exec

RSpec.configure do |c|
  c.before :all do
    c.path = '/sbin:/usr/sbin:/bin:/usr/bin'
  end
end

describe command('lsb_release -a') do
  its(:stdout){ should match /Description:	Ubuntu 16\.04\..*LTS$/ }
end

%w{ bcrypt letsencrypt }.each do |p|
  describe command("/opt/crossbar/bin/pypy -m pip list | grep #{p}") do
    its(:stdout){ should match /^#{p}/ }
  end
end

%w{ mc unrar crossbar letsencrypt }.each do |p|
  describe package(p) do
    it { should be_installed }
  end
end

describe user('ubuntu') do
  it { should exist }
end

describe command('su - ubuntu -c \'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm --version\'') do
  its(:stdout){ should match /^0\.33\./ }
end

describe command('su - ubuntu -c \'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm list v7.7.2\'') do
  its(:stdout){ should match /v7\.7\.2/ }
end
