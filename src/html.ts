export const homepageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Uploader</title>
    <style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --success-color: #28a745;
            --danger-color: #dc3545;
            --light-color: #f8f9fa;
            --dark-color: #343a40;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body {
            font-family: var(--font-family);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: var(--light-color);
            color: var(--dark-color);
        }
        .container {
            max-width: 500px;
            width: 100%;
            padding: 2rem;
        }
        #upload-container {
            border: 3px dashed #ccc;
            border-radius: 10px;
            padding: 2rem;
            text-align: center;
            cursor: pointer;
            transition: background-color 0.2s, border-color 0.2s;
        }
        #upload-container.dragover {
            background-color: #e9ecef;
            border-color: var(--primary-color);
        }
        #upload-container p {
            margin: 0;
            font-size: 1.2rem;
        }
        #preview {
            margin-top: 1rem;
            max-width: 100%;
            border-radius: 5px;
            display: none;
        }
        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 1rem auto;
            display: none;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        #result {
            margin-top: 1.5rem;
            display: none; /* Initially hidden */
            width: 100%;
        }
        #result input {
            /* width: calc(100% - 110px); */
            flex-grow: 1;
            padding: 0.5rem;
            border: 1px solid #ccc;
            border-radius: 5px 0 0 5px;
            font-size: 1rem;
            border-right: none;
        }
        #result button {
            padding: 0.5rem 1rem;
            border: 1px solid var(--primary-color);
            background-color: var(--primary-color);
            color: white;
            border-radius: 0 5px 5px 0;
            cursor: pointer;
            font-size: 1rem;
            margin-left: 0;
        }
        #result button:hover {
            background-color: #0056b3;
        }
        #error {
            color: var(--danger-color);
            margin-top: 1rem;
            text-align: center;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="upload-container">
            <p>Drag & drop an image here, or click to select one</p>
            <input type="file" id="file-input" accept="image/*" style="display: none;">
            <img id="preview" src="" alt="Image preview">
        </div>
        <div class="loader" id="loader"></div>
        <div id="result">
            <input type="text" id="image-url" readonly>
            <button id="copy-button">Copy</button>
        </div>
        <div id="error"></div>
    </div>

    <script>
        const uploadContainer = document.getElementById('upload-container');
        const fileInput = document.getElementById('file-input');
        const preview = document.getElementById('preview');
        const loader = document.getElementById('loader');
        const resultDiv = document.getElementById('result');
        const imageUrlInput = document.getElementById('image-url');
        const copyButton = document.getElementById('copy-button');
        const errorDiv = document.getElementById('error');

        uploadContainer.addEventListener('click', () => fileInput.click());

        uploadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadContainer.classList.add('dragover');
        });

        uploadContainer.addEventListener('dragleave', () => {
            uploadContainer.classList.remove('dragover');
        });

        uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadContainer.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFile(file);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFile(file);
            }
        });

        function copyUrlToClipboard() {
            imageUrlInput.select();
            document.execCommand('copy');
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy';
            }, 2000);
        }

        copyButton.addEventListener('click', copyUrlToClipboard);

        function handleFile(file) {
            // Reset UI
            preview.style.display = 'none';
            resultDiv.style.display = 'none';
            errorDiv.style.display = 'none';
            loader.style.display = 'block';
            uploadContainer.style.display = 'none';


            preview.src = URL.createObjectURL(file);
            preview.onload = () => {
                URL.revokeObjectURL(preview.src); // free memory
            }
            
            const formData = new FormData();
            formData.append('image', file);

            fetch('/upload', {
                method: 'PUT',
                body: formData,
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${ response.status }\`);
                }
                return response.text();
            })
            .then(key => {
                loader.style.display = 'none';
                preview.style.display = 'block';
                uploadContainer.style.display = 'block';
                
                const fullUrl = \`\${ window.location.origin }/\${key}\`;
imageUrlInput.value = fullUrl;
resultDiv.style.display = 'flex';

// Automatically copy to clipboard
copyUrlToClipboard();
            })
            .catch (error => {
    loader.style.display = 'none';
    uploadContainer.style.display = 'block';
    errorDiv.textContent = \`Error uploading file: \${error.message}\`;
    errorDiv.style.display = 'block';
    console.error('Error uploading file:', error);
});
        }
</script>
    </body>
    </html>`