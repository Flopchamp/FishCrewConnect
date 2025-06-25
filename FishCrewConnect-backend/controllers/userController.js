const db = require('../config/db');

// @desc    Get current user profile with extended profile data
// @route   GET /api/users/me
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        // req.user is set by the authMiddleware
        const userId = req.user.id;        // Fetch basic user details from the database, excluding the password_hash
        const [users] = await db.query(
            'SELECT user_id, user_type, email, name, contact_number, organization_name, created_at, updated_at FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get the basic user data
        const userData = users[0];

        // Try to fetch extended profile data from user_profiles table
        const [profiles] = await db.query(
            'SELECT profile_image, location, years_experience, bio, specialties, skills, available, rating FROM user_profiles WHERE user_id = ?',
            [userId]
        );

        // If profile exists, merge the data
        if (profiles.length > 0) {
            const profileData = profiles[0];
            
            // Parse JSON fields if they exist
            if (profileData.specialties) {
                try {
                    profileData.specialties = JSON.parse(profileData.specialties);
                } catch (e) {
                    profileData.specialties = [];
                }
            } else {
                profileData.specialties = [];
            }
            
            if (profileData.skills) {
                try {
                    profileData.skills = JSON.parse(profileData.skills);
                } catch (e) {
                    profileData.skills = [];
                }
            } else {
                profileData.skills = [];
            }
            
            // Merge the data
            Object.assign(userData, profileData);
        } else {
            // If no profile data exists, add default values for the frontend
            userData.profile_image = null;
            userData.location = '';
            userData.years_experience = 0;
            userData.bio = '';
            userData.specialties = [];
            userData.skills = [];
            userData.available = true;
            userData.rating = null;
            
            // Create a default profile record for future updates
            await db.query(
                'INSERT INTO user_profiles (user_id) VALUES (?)',
                [userId]
            );
        }        // Get average rating from reviews if available
        try {
            const [reviewData] = await db.query(
                'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM reviews WHERE reviewed_user_id = ?',
                [userId]
            );
              if (reviewData[0] && reviewData[0].average_rating) {
                userData.rating = parseFloat(reviewData[0].average_rating).toFixed(1);
                userData.review_count = reviewData[0].review_count || 0;
            }
        } catch (error) {
            console.error('Error fetching rating data:', error);
            // Continue without rating data if there's an error
        }

        // Ensure consistent field naming for frontend compatibility
        // Add 'id' field to match login response structure
        userData.id = userData.user_id;

        res.json(userData);
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUserProfile = async (req, res) => {
    const { 
        // Basic user fields
        name, 
        contact_number, 
        organization_name,
        
        // Extended profile fields
        profile_image,
        location,
        years_experience,
        bio,
        specialties,
        skills,
        available
    } = req.body;
    
    const userId = req.user.id; // From authMiddleware
    
    // Validate required fields based on user type
    try {
        const [userType] = await db.query(
            'SELECT user_type FROM users WHERE user_id = ?',
            [userId]
        );
        
        if (userType.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Validate required fields
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Name is required.' });
        }
        
        // Additional validation for boat owners
        if (userType[0].user_type === 'boat_owner' && (!organization_name || organization_name.trim() === '')) {
            return res.status(400).json({ message: 'Organization name is required for boat owners.' });
        }
          // Validate years_experience if provided
        if (years_experience !== undefined && years_experience !== null) {
            const yearsExp = parseInt(years_experience);
            if (isNaN(yearsExp) || yearsExp < 0) {
                return res.status(400).json({ message: 'Years of experience must be a valid positive number.' });
            }
        }
        
        // Validate contact_number if provided (should only contain digits)
        if (contact_number !== undefined && contact_number !== null && contact_number !== '') {
            const contactStr = contact_number.toString().trim();
            if (contactStr && !/^\d+$/.test(contactStr)) {
                return res.status(400).json({ message: 'Contact number should only contain digits.' });
            }
        }
    } catch (validationError) {
        console.error('Validation error:', validationError);
        return res.status(500).json({ message: 'Error validating profile data' });
    }

    try {
        // First, update the basic user fields in the users table
        let userSetClauses = [];
        let userQueryParams = [];

        if (name !== undefined) {
            userSetClauses.push('name = ?');
            userQueryParams.push(name);
        }
        if (contact_number !== undefined) {
            userSetClauses.push('contact_number = ?');
            userQueryParams.push(contact_number);
        }
        if (organization_name !== undefined) {
            userSetClauses.push('organization_name = ?');
            userQueryParams.push(organization_name);
        }
        
        // If we have basic fields to update
        if (userSetClauses.length > 0) {
            userQueryParams.push(userId); // For the WHERE clause
            const userSql = `UPDATE users SET ${userSetClauses.join(', ')}, updated_at = NOW() WHERE user_id = ?`;
            
            await db.query(userSql, userQueryParams);
        }

        // Now handle the extended profile fields
        const profileFields = {
            profile_image,
            location,
            years_experience,
            bio,
            specialties: specialties ? JSON.stringify(specialties) : undefined,
            skills: skills ? JSON.stringify(skills) : undefined,
            available
        };
        
        // Filter out undefined values
        const validProfileFields = {};
        Object.entries(profileFields).forEach(([key, value]) => {
            if (value !== undefined) {
                validProfileFields[key] = value;
            }
        });
        
        // If we have extended profile fields to update
        if (Object.keys(validProfileFields).length > 0) {
            // Check if a profile record exists
            const [profileCheck] = await db.query(
                'SELECT profile_id FROM user_profiles WHERE user_id = ?',
                [userId]
            );
            
            if (profileCheck.length > 0) {
                // Update existing profile
                const profileSetClauses = Object.keys(validProfileFields).map(key => `${key} = ?`);
                const profileQueryParams = [...Object.values(validProfileFields), userId];
                
                const profileSql = `UPDATE user_profiles SET ${profileSetClauses.join(', ')}, updated_at = NOW() WHERE user_id = ?`;
                await db.query(profileSql, profileQueryParams);
            } else {
                // Create new profile
                validProfileFields.user_id = userId;
                
                const profileFields = Object.keys(validProfileFields).join(', ');
                const profilePlaceholders = Object.keys(validProfileFields).map(() => '?').join(', ');
                
                const profileSql = `INSERT INTO user_profiles (${profileFields}) VALUES (${profilePlaceholders})`;
                await db.query(profileSql, Object.values(validProfileFields));
            }
        }

        // Fetch the updated complete profile to return
        // Get basic user data
        const [users] = await db.query(
            'SELECT user_id, user_type, email, name, contact_number, organization_name, created_at, updated_at FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found after update.' });
        }

        const userData = users[0];
        
        // Get extended profile data
        const [profiles] = await db.query(
            'SELECT profile_image, location, years_experience, bio, specialties, skills, available, rating FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        
        // If profile exists, merge with user data
        if (profiles.length > 0) {
            const profileData = profiles[0];
            
            // Parse JSON fields
            if (profileData.specialties) {
                try {
                    profileData.specialties = JSON.parse(profileData.specialties);
                } catch (e) {
                    profileData.specialties = [];
                }
            } else {
                profileData.specialties = [];
            }
            
            if (profileData.skills) {
                try {
                    profileData.skills = JSON.parse(profileData.skills);
                } catch (e) {
                    profileData.skills = [];
                }
            } else {
                profileData.skills = [];
            }
            
            // Merge data
            Object.assign(userData, profileData);
        }
        
        res.json(userData);    } catch (error) {
        console.error('Update user profile error:', error);
        
        // Provide more detailed error messages based on the type of error
        if (error.code === 'ER_NO_REFERENCED_ROW') {
            res.status(400).json({ message: 'Invalid reference: One or more referenced IDs do not exist.' });
        } else if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ message: 'A record with this information already exists.' });
        } else if (error.sql) {
            // SQL error but don't expose SQL details to client
            console.error('SQL error in profile update:', error.sql);
            res.status(500).json({ message: 'Database error while updating profile.' });
        } else {
            res.status(500).json({ message: 'Server error while updating profile.' });
        }
    }
};

// @desc    Get user's average rating from reviews
// @route   GET /api/users/:id/rating
// @access  Public
exports.getUserRating = async (req, res) => {
    try {
        const userId = req.params.id;

        // Get average rating from reviews
        const [reviewData] = await db.query(
            'SELECT AVG(rating) as average_rating, COUNT(*) as review_count FROM reviews WHERE reviewed_user_id = ?',
            [userId]
        );
        
        if (!reviewData[0].average_rating) {
            return res.json({ 
                rating: null, 
                count: 0,
                message: 'No reviews yet' 
            });
        }
        
        res.json({
            rating: parseFloat(reviewData[0].average_rating).toFixed(1),
            count: reviewData[0].review_count,
            message: 'User rating retrieved successfully'
        });
    } catch (error) {
        console.error('Error getting user rating:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all users as contacts
// @route   GET /api/users/contacts
// @access  Private
exports.getAllContacts = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        
        // Fetch all users except the current one, with minimal data needed for contacts
        const [users] = await db.query(
            `SELECT u.user_id as id, u.name, u.user_type, 
                    p.profile_image, p.location
             FROM users u
             LEFT JOIN user_profiles p ON u.user_id = p.user_id
             WHERE u.user_id != ?
             ORDER BY u.name ASC`,
            [currentUserId]
        );

        // Format user_type to match frontend expectations
        const contacts = users.map(user => ({
            ...user,
            userType: user.user_type,
            profileImage: user.profile_image
        }));

        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: 'Server error while fetching contacts.' });
    }
};

// @desc    Get user by ID (public profile view)
// @route   GET /api/users/:id
// @access  Public
exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Fetch basic user details from the database, excluding sensitive information
        const [users] = await db.query(
            'SELECT user_id, user_type, name, organization_name, created_at FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get the basic user data
        const userData = users[0];

        // Try to fetch public profile data from user_profiles table
        const [profiles] = await db.query(
            'SELECT profile_image, location, years_experience, bio, specialties, skills, rating FROM user_profiles WHERE user_id = ?',
            [userId]
        );

        // If profile exists, merge the data
        if (profiles.length > 0) {
            const profileData = profiles[0];
            
            // Parse JSON fields if they exist
            if (profileData.specialties) {
                try {
                    profileData.specialties = JSON.parse(profileData.specialties);
                } catch (e) {
                    profileData.specialties = [];
                }
            } else {
                profileData.specialties = [];
            }
            
            if (profileData.skills) {
                try {
                    profileData.skills = JSON.parse(profileData.skills);
                } catch (e) {
                    profileData.skills = [];
                }
            } else {
                profileData.skills = [];
            }
            
            // Merge user data with profile data
            Object.assign(userData, profileData);
        } else {
            // If no profile exists, set default values
            userData.profile_image = null;
            userData.location = null;
            userData.years_experience = null;
            userData.bio = null;
            userData.specialties = [];
            userData.skills = [];
            userData.rating = null;
        }

        res.json(userData);
    } catch (error) {
        console.error('Error getting user by ID:', error);
        res.status(500).json({ message: 'Server error while fetching user profile.' });
    }
};