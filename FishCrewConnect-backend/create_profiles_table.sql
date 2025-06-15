CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  profile_image VARCHAR(255),
  location VARCHAR(100),
  years_experience INT DEFAULT 0,
  bio TEXT,
  specialties JSON,
  skills JSON,
  available BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
