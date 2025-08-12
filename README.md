# AI-Powered Website Generator

A sophisticated web-based IDE that enables users to build websites using Claude Code SDK.

This was made almost entirely by Claude Code and prompting as an example of how to use Claude Code and what it can accomplish.

## Features

- **AI-Powered Development**: Chat with Claude to generate and modify website code
- **Live Preview**: See your changes in real-time with integrated Sandpack preview
- **Full IDE Experience**: Monaco editor with syntax highlighting, file tree navigation, and multi-tab editing
- **Persistent Storage**: All projects are saved locally using IndexedDB
- **Import/Export**: Download your projects as ZIP files or import existing ones
- **Modern Tech Stack**: Built with Next.js 15, React 19, and TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- A Claude API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cc-example
```

2. Navigate to the website generator:
```bash
cd website-generator
```

3. Install dependencies:
```bash
npm install
```

4. Create a `.env.local` file and add your Claude API key:
```bash
ANTHROPIC_API_KEY=your-api-key-here
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Chat Interface**: Use the left panel to chat with Claude about the website you want to create
2. **File Management**: Browse and edit files in the right panel's Files tab
3. **Live Preview**: Switch to the Preview tab to see your website in action
4. **Export Projects**: Download your work as a ZIP file for deployment or backup

## Project Structure

```
cc-example/
├── website-generator/      # Main application
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   ├── lib/              # Core business logic
│   └── package.json      # Dependencies
├── documentation/         # Project documentation
├── planning.md           # Development roadmap
└── CLAUDE.md            # AI assistant instructions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting

### Key Technologies

- **Frontend**: Next.js 15.4.6, React 19.1.0
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Editor**: Monaco Editor
- **Preview**: Sandpack (React template)
- **AI**: Claude Code SDK
- **Storage**: IndexedDB

## Security Notes

- All code execution happens in a sandboxed environment
- File operations are restricted to specific directories
- The AI has built-in guardrails for safe code generation

## Contributing

Please read the [planning.md](planning.md) file to understand the project architecture and development status before contributing.

## License

This project is private and not currently licensed for public use.