import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import LogRenameInline from "@/components/logs/LogRenameInline";

describe("LogRenameInline", () => {
  it("renders value and allows editing and saving", async () => {
    const onRename = vi.fn().mockResolvedValue(true);
    render(<LogRenameInline value="Original" onRename={onRename} />);

    // show pencil
    const button = screen.getByRole("button", { name: /Rename log/i });
    fireEvent.click(button);

    const input = screen.getByLabelText(/Edit log name/i) as HTMLInputElement;
    expect(input.value).toBe("Original");

    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // wait for callback to be called
    expect(onRename).toHaveBeenCalledWith("New Name");
  });
});
