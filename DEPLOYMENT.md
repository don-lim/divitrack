# cPanel Deployment Guide for DiviTrack

This guide outlines the steps to deploy the DiviTrack application on a cPanel server as a subdomain, utilizing cPanel's Node.js selector.

## Prerequisites

-   A cPanel hosting account with Node.js support.
-   Access to cPanel's File Manager and Node.js Setup.
-   Your cPanel account should be configured to host a subdomain.

## 1. Prepare Deployment Files

cPanel supports Next.js deployments. However, it may only support commonJS files and may suppress exotic features. Before uploading to cPanel, you need to build a `.next` folder for deployment using the Next.js build process. This build coverts everything into a commonJS format.

### 1.1. Build a production bundle

In your project's root directory, run `npm run build`:

```bash
npm run build
```

### 1.2. Compress your `.next` directory and others

From the root directory of your project, compress the `.next` directory and others into a zip file. This will make uploading to cPanel easier and faster.

```bash
zip -r ../DiviTrack-next.zip . --exclude ".git/*" .gitignore "node_modules/*" 
```

You may need to zip everything (not just the `.next` directory) to make sure it runs smoothly in different environments.

This command creates a `DiviTrack-next.zip` file in the parent director of your project's root, containing all the files in the project directory, while excluding `.git` and `node_modules`.

## 2. Upload to cPanel

1.  Log in to your cPanel account.
2.  Navigate to **File Manager**.
3.  Go to the directory where you want to host your subdomain (outside `public_html` is recommended to avoid the parent folder's .htacess rules).
4.  Create a new directory for your application subdomain (e.g., `divitrack.domain.com`).
5.  Upload the `DiviTrack-next.zip` file into this new directory.
6.  Once uploaded, extract the contents of `DiviTrack-next.zip` into the same directory (`divitrack.domain.com`).

## 3. Set Up Node.js Application in cPanel

1.  In cPanel, search for and open **Setup Node.js App**.
2.  Click **Create Application**.
3.  Configure the Node.js application settings:
    -   **Node.js version**: Choose a version compatible with your application (v18 or higher).
    -   **Application mode**: Choose "Production".
    -   **Application root**: Enter the path to your application directory. If you uploaded to `divitrack.domain.com`, the path could be `/home/yourcpanelusername/divitrack.domain.com`. Replace `yourcpanelusername` with your actual cPanel username.
    -   **Application URL**: Select your subdomain from the dropdown menu. Ensure the document root is correctly pointing to your application's public directory or the directory where your `.next` is located.
    -   **Application startup file**:  Set this to `server.js`. This file is responsible for starting the Next.js application.
    -   **Application Entry point**: Leave this field empty.
    -   **Passenger log file**: This should be something like /home/yourcpanelusername/`divitrack.domain.com/passenger.log`. Check this file for server logs.
4.  Click **Create**.
5.  Stop the app from the **Setup Node.js App** page, press `Run NPM Intall` to install dependencies, and restart the app.

(Alternatively)
- Once the application is created, cPanel will provide commands to enter into the terminal. Copy the command that starts with `cd` and use cPanel's **Terminal** feature to execute it. This will navigate you to your application root in the terminal. 
- In the terminal, run `npm install` to install the required Node.js dependencies. This will install all packages listed in your `package.json` file.
- After `npm install` completes, go back to the **Setup Node.js App** interface in cPanel and click **Restart Application**.

## 4. Access Your Application

Your DiviTrack application should now be live and accessible via your chosen subdomain URL.

## 5. Updating Your Application

To update your application with new changes:

1.  **Prepare new .next files**: Repeat steps in **Section 1. Prepare Deployment Files** to create an updated `DiviTrack-next.zip` file.
2.  **Upload and Extract**: In cPanel's **File Manager**, navigate to your application directory (`divitrack.domain.com`) and delete the existing application files and directories except `node_modules`, `.well-known`, `cgi-bin`, and `.htacess`. If you want to reinstall dependencies, go to the **Setup Node.js App** page and press `Run NPM Intall`. It will automatically install and uninstall components according to your new `package.json`. Upload and extract the new `DiviTrack-next.zip` file as described in **Section 2. Upload to cPanel**.
3.  **Restart Node.js Application**: In cPanel, go to **Setup Node.js App**, find your application, and click **Restart Application** to apply the updates.

By following these steps, you can successfully deploy and manage your DiviTrack application on a cPanel server as a subdomain. Subfolder configuration under a different platform doesn't work well.
