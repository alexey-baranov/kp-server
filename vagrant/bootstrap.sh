#!/bin/bash

# Configure locales
echo locales locales/locales_to_be_generated multiselect en_US.UTF-8 UTF-8 | debconf-set-selections
echo locales locales/default_environment_locale select  en_US.UTF-8 | debconf-set-selections
dpkg-reconfigure locales -f noninteractive
echo -e 'LANG=en_US.UTF-8\nLC_ALL=en_US.UTF-8' > /etc/default/locale

# Prepare OS
su - root -c 'apt-get update'
su - root -c 'apt-get install ruby -y'

# User ubuntu, creates only if virtual environment, in production should be created at Ubuntu installation step
 id ubuntu > /dev/null 2>&1 || adduser --disabled-password --gecos "" ubuntu

# NTP
su - root -c 'apt-get install ntp -y'

# Postgresql
su - root -c 'apt-get install postgresql -y'
sed -i 's/^\(#m\|m\)ax_connections.*/max_connections = 1000/g' /etc/postgresql/9.5/main/postgresql.conf
sed -i 's/^\(#s\|s\)hared_buffers.*/shared_buffers = 512MB/g' /etc/postgresql/9.5/main/postgresql.conf
sed -i 's/^\(#e\|e\)ffective_cache_size.*/effective_cache_size = 1024MB/g' /etc/postgresql/9.5/main/postgresql.conf
sed -i 's/^\(#w\|w\)ork_mem.*/work_mem = 40MB/g' /etc/postgresql/9.5/main/postgresql.conf
service postgresql restart

# Packages 
su - root -c 'apt-get install mc unrar -y'
su - root -c 'apt-get install python-pip -y'
su - root -c 'apt-get install libffi-dev'
su - root -c 'apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5FC6281FD58C6920'
echo 'deb http://package.crossbar.io/ubuntu xenial main' > /etc/apt/sources.list.d/crossbar.list
su - root -c 'apt-get update'
su - root -c 'apt-get install crossbar -y'
su - root -c 'apt-get install postgresql-server-dev-all -y'
su - root -c '/opt/crossbar/bin/pypy -m pip install --upgrade pip'
su - root -c '/opt/crossbar/bin/pypy -m pip install bcrypt'
su - root -c '/opt/crossbar/bin/pypy -m pip install letsencrypt'

su - ubuntu -c 'wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.1/install.sh | bash'
su - ubuntu -c 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm install v7.7.2'

# Postfix
debconf-set-selections <<< "postfix postfix/mailname string your.hostname.com"
debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
su - root -c 'apt-get install -y postfix'

# xubuntu-desktop
su - root -c 'apt-get install -y xubuntu-desktop'
systemctl disable lightdm.service
service lightdm stop

# SFTP
su - root -c 'apt-get install mysecureshell -y'

# Certificates, commented because manual answering require
su - root -c 'apt-get install letsencrypt -y'
#su - ubuntu -c 'mkdir -p /home/ubuntu/htdocs/kp-client/dist'
#letsencrypt certonly --webroot -w letsencrypt certonly --webroot -w /home/ubuntu/htdocs/kp-client/dist -d kopnik.org -d www.kopnik.org -d kopnik.org -d www.kopnik.org
