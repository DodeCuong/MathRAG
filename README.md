# MathStorage
MathStorage is an OCR-powered web platform tailored for STEM students. It allows users to upload mathematical materials (images/PDFs) and seamlessly converts them into editable LaTeX (.tex) files. The system features automatic cloud synchronization, ensuring users can securely store, manage, and retrieve their processed documents anytime.

## Tech Stack
* **Frontend:** ReactJS (UI/UX), MathJax/KaTeX (for real-time LaTeX rendering)
* **Backend:** Python with Flask (RESTful API)
* **Database:** MySQL (User data mapping) & Cloud Storage (AWS S3 / Firebase for file storage)
* **AI/OCR Engine:** Meta's Nougat (Pre-trained model for scientific document extraction)

## User Flow
1. **Authentication:** Secure login using Google OAuth.
2. **Upload:** Users upload their mathematical materials in Image or PDF formats.
3. **Processing:** The Flask backend processes the file using the Nougat OCR model to extract text and mathematical formulas.
4. **Preview & Edit:** Users can preview the rendered LaTeX side-by-side with their original document and fix any minor OCR inaccuracies directly on the web interface.
5. **Save & Download:** The final document is saved to the user's cloud storage (via MySQL mapping) and can be downloaded as a `.tex` file.