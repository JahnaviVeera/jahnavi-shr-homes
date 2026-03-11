import supabase from '../config/supabase.client';

/**
 * Script to create the 'documents' bucket in Supabase Storage
 * Run this once to set up the required storage bucket
 */
async function createDocumentsBucket() {
    try {
        console.log('Creating documents bucket in Supabase...');

        // Create the bucket
        const { data, error } = await supabase.storage.createBucket('documents', {
            public: true, // Set to true if you want files to be publicly accessible
            fileSizeLimit: 52428800, // 50MB limit
            allowedMimeTypes: [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ Bucket "documents" already exists!');
                return;
            }
            throw error;
        }

        console.log('✅ Successfully created "documents" bucket!');
        console.log('Bucket details:', data);

        // List all buckets to verify
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.error('Error listing buckets:', listError);
        } else {
            console.log('\nAll available buckets:');
            buckets.forEach((bucket: any) => {
                console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
            });
        }

    } catch (error) {
        console.error('❌ Error creating bucket:', error);
        throw error;
    }
}

// Run the script
createDocumentsBucket()
    .then(() => {
        console.log('\n✅ Bucket setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Bucket setup failed:', error);
        process.exit(1);
    });
