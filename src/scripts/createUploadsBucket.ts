import supabase from '../config/supabase.client';

/**
 * Script to create the 'uploads' bucket in Supabase Storage
 * This bucket is used for daily updates (images and videos)
 */
async function createUploadsBucket() {
    try {
        console.log('Creating uploads bucket in Supabase...');

        // Create the bucket
        const { data, error } = await supabase.storage.createBucket('uploads', {
            public: true,
            allowedMimeTypes: [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'video/mp4',
                'video/mpeg',
                'video/ogg',
                'video/webm',
                'video/quicktime',
                'application/pdf'
            ]
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ Bucket "uploads" already exists!');

                // Update the bucket to ensure it has the correct limits and mime types
                const { error: updateError } = await supabase.storage.updateBucket('uploads', {
                    public: true,
                    allowedMimeTypes: [
                        'image/jpeg',
                        'image/png',
                        'image/gif',
                        'image/webp',
                        'video/mp4',
                        'video/mpeg',
                        'video/ogg',
                        'video/webm',
                        'video/quicktime',
                        'application/pdf'
                    ]
                });

                if (updateError) {
                    console.error('Error updating bucket:', updateError);
                } else {
                    console.log('✅ Updated "uploads" bucket settings.');
                }
                return;
            }
            throw error;
        }

        console.log('✅ Successfully created "uploads" bucket!');
        console.log('Bucket details:', data);

    } catch (error) {
        console.error('❌ Error creating bucket:', error);
        throw error;
    }
}

// Run the script
createUploadsBucket()
    .then(() => {
        console.log('\n✅ Uploads bucket setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Uploads bucket setup failed:', error);
        process.exit(1);
    });
