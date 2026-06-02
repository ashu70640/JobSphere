import { useState } from "react";
import { API_JOBS } from "../utils/api";
import { apiFetch } from "../utils/apiFetch";

const JobNotes = ({ job, setJob }) => {
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editedText, setEditedText] = useState("");
    const [newNote, setNewNote] = useState("");

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        try {
            const res = await apiFetch(`${API_JOBS}/${job._id}/notes`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: newNote }),
            });

            const data = await res.json();

            if (res.ok) {
                setJob(data.job);
                setNewNote("");
            }
        } catch (err) {
            console.error("Error adding note:", err);
        }
    };

    const handleDeleteNote = async (noteId) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this note?"
        );

        if (!confirmDelete) return;

        try {
            const res = await apiFetch(`${API_JOBS}/${job._id}/notes/${noteId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (res.ok) {
                setJob(data.job);
            }
        } catch (err) {
            console.error("Error deleting note:", err);
        }
    };

    const handleUpdateNote = async (noteId) => {
        if (!editedText.trim()) return;

        try {
            const res = await apiFetch(`${API_JOBS}/${job._id}/notes/${noteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: editedText }),
            });

            const data = await res.json();

            if (res.ok) {
                setJob(data.job);
                setEditingNoteId(null);
                setEditedText("");
            }
        } catch (err) {
            console.error("Error updating note:", err);
        }
    };

    return (
        <div className="space-y-6">

            {/* Notes List */}
            <div className="space-y-4">

                {job.notes && job.notes.length > 0 ? (
                    job.notes
                        .slice()
                        .reverse()
                        .map((note) => (
                            <div
                                key={note._id}
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                            >

                                {editingNoteId === note._id ? (
                                    <>
                                        <textarea
                                            value={editedText}
                                            onChange={(e) => setEditedText(e.target.value)}
                                            rows="3"
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none mb-3"
                                        />

                                        <div className="flex gap-3">

                                            <button
                                                onClick={() => handleUpdateNote(note._id)}
                                                className="bg-blue-600 text-white px-3 py-1 rounded-xl hover:bg-blue-700 text-sm"
                                            >
                                                Save
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditingNoteId(null);
                                                    setEditedText("");
                                                }}
                                                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-xl hover:bg-gray-300 text-sm"
                                            >
                                                Cancel
                                            </button>

                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-gray-700 text-sm leading-relaxed">
                                            {note.text}
                                        </p>

                                        <div className="flex justify-between items-center mt-3">

                                            <span className="text-xs text-gray-400">
                                                {new Date(note.createdAt).toLocaleString()}
                                            </span>

                                            <div className="flex gap-3 text-sm">

                                                <button
                                                    onClick={() => {
                                                        setEditingNoteId(note._id);
                                                        setEditedText(note.text);
                                                    }}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteNote(note._id)}
                                                    className="text-red-600 hover:underline"
                                                >
                                                    Delete
                                                </button>

                                            </div>
                                        </div>
                                    </>
                                )}

                            </div>
                        ))
                ) : (
                    <p className="text-gray-400 text-sm">No notes added yet.</p>
                )}

            </div>

            {/* Add Note Section */}

            <div className="border-t pt-4">

                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows="3"
                    placeholder="Add interview notes..."
                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none mb-3"
                />

                <button
                    onClick={handleAddNote}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                    Add Note
                </button>

            </div>

        </div>
    );
};

export default JobNotes;