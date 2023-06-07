create database BONGU_ABI_DB default character set utf8 collate utf8_general_ci;

CREATE USER 'contract_manager'@'localhost' IDENTIFIED BY '1q2w3e4r';
GRANT ALL PRIVILEGES ON *.* TO 'contract_manager'@'localhost';
FLUSH PRIVILEGES;

CREATE TABLE contracts (
  contracts_id        INT NOT NULL AUTO_INCREMENT,
  group_id     INT NOT NULL,
  contract_address    VARCHAR(100) NOT NULL,
  contract_title VARCHAR(255) NOT NULL,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  PRIMARY KEY(contracts_id)
);

CREATE TABLE votes (
  votes_id        INT NOT NULL AUTO_INCREMENT,
  group_id     INT NOT NULL,
  user_id    INT NOT NULL,
  vote_count INT NOT NULL,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  PRIMARY KEY(votes_id)
);

CREATE TABLE dreaming_deposit (
  dreaming_deposit_id        INT NOT NULL AUTO_INCREMENT,
  group_id     INT NOT NULL,
  revenue    INT NOT NULL,
  finance JSON NOT NULL,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  PRIMARY KEY(dreaming_deposit_id)
);

CREATE TABLE contract_log (
  contracts_log_id        INT NOT NULL AUTO_INCREMENT,
  group_id     INT NOT NULL,
  transaction_hash    VARCHAR(255) NOT NULL,
  created_at timestamp not null default current_timestamp,
  PRIMARY KEY(contracts_log_id)
);

INSERT INTO user_auth_info (id, user_id, user_pw, nick_name)
	   	    VALUE(NULL, 'admin',  'admin', 'admin');

