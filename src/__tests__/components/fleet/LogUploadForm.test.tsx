import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LogUploadForm from "@/components/fleet/LogUploadForm";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a mock file
const createMockFile = (name: string, size: number = 1024) => {
  const file = new File(["mock content"], name, { type: "text/plain" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("LogUploadForm", () => {
  const mockOnSuccess = vi.fn();
  const sessionId = "test-session-id";

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSuccess.mockClear();
  });

  it("renders form with file and pilot name inputs", () => {
    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText("Log File (.txt)")).toBeInTheDocument();
    expect(screen.getByLabelText("Pilot Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Ship Type (Optional)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload Log" }),
    ).toBeInTheDocument();
  });

  it("accepts .txt files and rejects non-.txt files", async () => {
    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText("Log File (.txt)");

    // Valid .txt file
    const validFile = createMockFile("combat-log.txt");
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    expect(
      screen.queryByText("Please select a .txt file"),
    ).not.toBeInTheDocument();

    // Invalid file
    const invalidFile = createMockFile("combat-log.log");
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(screen.getByText("Please select a .txt file")).toBeInTheDocument();
  });

  it("rejects files larger than 10MB", () => {
    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText("Log File (.txt)");

    // File too large
    const largeFile = createMockFile("large-log.txt", 11 * 1024 * 1024); // 11MB
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    expect(
      screen.getByText("File too large. Maximum size is 10MB"),
    ).toBeInTheDocument();
  });

  it("submits form and calls upload API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "Upload successful" }),
    });

    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText("Log File (.txt)");
    const pilotInput = screen.getByLabelText("Pilot Name");
    const shipInput = screen.getByLabelText("Ship Type (Optional)");
    const submitButton = screen.getByRole("button", { name: "Upload Log" });

    const file = createMockFile("combat-log.txt");
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(pilotInput, { target: { value: "Test Pilot" } });
    fireEvent.change(shipInput, { target: { value: "Drake" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/fleet-sessions/${sessionId}/upload`,
        {
          method: "POST",
          body: expect.any(FormData),
        },
      );
    });

    // Check FormData contents
    const formData = mockFetch.mock.calls[0][1].body;
    expect(formData.get("file")).toEqual(file);
    expect(formData.get("pilotName")).toBe("Test Pilot");
    expect(formData.get("shipType")).toBe("Drake");
  });

  it("triggers success callback and clears form on successful upload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "Upload successful" }),
    });

    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText("Log File (.txt)");
    const pilotInput = screen.getByLabelText("Pilot Name");
    const submitButton = screen.getByRole("button", { name: "Upload Log" });

    const file = createMockFile("combat-log.txt");
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(pilotInput, { target: { value: "Test Pilot" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(
        screen.getByText("Log uploaded successfully!"),
      ).toBeInTheDocument();
    });

    // Form should be cleared (success state shows success message instead of form)
    expect(screen.queryByLabelText("Log File (.txt)")).not.toBeInTheDocument();
  });

  it("displays error message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: "Upload failed" }),
    });

    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText("Log File (.txt)");
    const pilotInput = screen.getByLabelText("Pilot Name");
    const submitButton = screen.getByRole("button", { name: "Upload Log" });

    const file = createMockFile("combat-log.txt");
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(pilotInput, { target: { value: "Test Pilot" } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("shows loading state during upload", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText("Log File (.txt)");
    const pilotInput = screen.getByLabelText("Pilot Name");
    const submitButton = screen.getByRole("button", { name: "Upload Log" });

    const file = createMockFile("combat-log.txt");
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(pilotInput, { target: { value: "Test Pilot" } });

    fireEvent.click(submitButton);

    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("validates required fields before submission", async () => {
    render(<LogUploadForm sessionId={sessionId} onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole("button", { name: "Upload Log" });

    fireEvent.click(submitButton);

    expect(
      screen.getByText("Please select a file and enter pilot name"),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
