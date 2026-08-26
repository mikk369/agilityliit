"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

/**
 * Rich text editor for competition descriptions.
 *
 * The public competition page already renders these as HTML, so the value is
 * an HTML string in and out — no migration needed for descriptions that were
 * written as plain text, they simply come back as one paragraph.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: value,
    // Next.js renders this on the server first; without it React complains
    // about a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[8rem] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      // Tiptap represents "empty" as <p></p>; store an empty string instead.
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="w-full border border-gray-300 rounded-lg min-h-[10rem] bg-gray-50" />
    );
  }

  return (
    <div className="w-full border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {editor.isEmpty && placeholder && (
        <p className="px-3 pb-2 text-sm text-gray-400 pointer-events-none -mt-8">
          {placeholder}
        </p>
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 px-2 py-1.5">
      <Button
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Paks"
      >
        <strong>B</strong>
      </Button>
      <Button
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Kaldkiri"
      >
        <em>I</em>
      </Button>
      <Button
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Pealkiri"
      >
        H
      </Button>
      <Button
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Loend"
      >
        •
      </Button>
      <Button
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Nummerdatud loend"
      >
        1.
      </Button>
      <Button
        active={editor.isActive("link")}
        onClick={() => toggleLink(editor)}
        label="Link"
      >
        🔗
      </Button>
    </div>
  );
}

function toggleLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  const url = window.prompt("Lingi aadress (https://...)");
  if (!url) return;

  // Only http(s) — a javascript: URL here would end up in the public page.
  if (!/^https?:\/\//i.test(url)) {
    alert("Link peab algama http:// või https://");
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function Button({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`w-8 h-8 text-sm rounded transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
