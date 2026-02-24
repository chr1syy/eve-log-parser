import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FleetParticipantsTable from "@/components/fleet/FleetParticipantsTable";
import type { FleetParticipant } from "@/types/fleet";

describe("FleetParticipantsTable", () => {
  const mockParticipants: FleetParticipant[] = [
    {
      pilotName: "Pilot Alpha",
      shipType: "Typhoon",
      damageDealt: 1200000000, // 1.2B
      damageTaken: 800000000, // 800M
      repsGiven: 500000000, // 500M
      repsTaken: 300000000, // 300M
      status: "active",
      logId: "log-1",
    },
    {
      pilotName: "Pilot Beta",
      shipType: "Tempest",
      damageDealt: 1000000000, // 1.0B
      damageTaken: 700000000, // 700M
      repsGiven: 300000000, // 300M
      repsTaken: 200000000, // 200M
      status: "inactive",
      logId: "log-2",
    },
    {
      pilotName: "Pilot Gamma",
      shipType: "Hurricane",
      damageDealt: 200000000, // 200M
      damageTaken: 300000000, // 300M
      repsGiven: 90000000, // 90M
      repsTaken: 100000000, // 100M
      status: "ready",
      logId: "log-3",
    },
  ];

  it("displays all 3 pilots in the table", () => {
    render(<FleetParticipantsTable participants={mockParticipants} />);

    expect(screen.getByText("Pilot Alpha")).toBeInTheDocument();
    expect(screen.getByText("Pilot Beta")).toBeInTheDocument();
    expect(screen.getByText("Pilot Gamma")).toBeInTheDocument();
  });

  it("displays correct ship types", () => {
    render(<FleetParticipantsTable participants={mockParticipants} />);

    expect(screen.getByText("Typhoon")).toBeInTheDocument();
    expect(screen.getByText("Tempest")).toBeInTheDocument();
    expect(screen.getByText("Hurricane")).toBeInTheDocument();
  });

  it("displays formatted damage and reps values", () => {
    render(<FleetParticipantsTable participants={mockParticipants} />);

    // Check formatted values appear
    expect(screen.getByText("1.2B")).toBeInTheDocument(); // damageDealt for Alpha
    expect(screen.getByText("800.0M")).toBeInTheDocument(); // damageTaken for Alpha
    expect(screen.getByText("500.0M")).toBeInTheDocument(); // repsGiven for Alpha
    expect(screen.getAllByText("300.0M").length).toBeGreaterThan(0); // repsTaken for Alpha

    expect(screen.getByText("1.0B")).toBeInTheDocument(); // damageDealt for Beta
    expect(screen.getByText("700.0M")).toBeInTheDocument(); // damageTaken for Beta
    expect(screen.getAllByText("300.0M").length).toBeGreaterThan(0); // repsGiven for Beta
    expect(screen.getAllByText("200.0M").length).toBeGreaterThan(0); // repsTaken for Beta

    expect(screen.getAllByText("200.0M").length).toBeGreaterThan(0); // damageDealt for Gamma (should appear twice, but that's fine)
    expect(screen.getAllByText("300.0M").length).toBeGreaterThan(0); // damageTaken for Gamma (appears twice)
    expect(screen.getByText("90.0M")).toBeInTheDocument(); // repsGiven for Gamma
    expect(screen.getByText("100.0M")).toBeInTheDocument(); // repsTaken for Gamma
  });

  it("displays status with correct colors", () => {
    render(<FleetParticipantsTable participants={mockParticipants} />);

    // Survived status (active and ready map to Survived with green)
    const survivedElements = screen.getAllByText("Survived");
    expect(survivedElements).toHaveLength(2); // Alpha and Gamma

    // Killed status (inactive maps to Killed with red)
    const killedElement = screen.getByText("Killed");
    expect(killedElement).toBeInTheDocument();

    // Check that the status spans have the correct classes
    const statusCells = screen.getAllByText(/^Survived|Killed$/);
    expect(statusCells).toHaveLength(3);

    // The red background should be on the Killed one
    const killedCell = statusCells.find(
      (cell) => cell.textContent === "Killed",
    );
    expect(killedCell).toHaveClass("bg-red-900/20", "text-red-400");

    // Green backgrounds for Survived
    const survivedCells = statusCells.filter(
      (cell) => cell.textContent === "Survived",
    );
    survivedCells.forEach((cell) => {
      expect(cell).toHaveClass("bg-green-900/20", "text-green-400");
    });
  });

  it("sorts by damage dealt descending by default", () => {
    render(<FleetParticipantsTable participants={mockParticipants} />);

    // Default sort is damageDealt descending, so Alpha (1.2B) should be first, then Beta (1.0B), then Gamma (200M)
    const rows = screen.getAllByRole("row");
    // Skip header row, check first data row
    const firstRowCells = rows[1].querySelectorAll("td");
    expect(firstRowCells[0]).toHaveTextContent("Pilot Alpha");

    const secondRowCells = rows[2].querySelectorAll("td");
    expect(secondRowCells[0]).toHaveTextContent("Pilot Beta");

    const thirdRowCells = rows[3].querySelectorAll("td");
    expect(thirdRowCells[0]).toHaveTextContent("Pilot Gamma");
  });

  it("sorts by pilot name when clicked", async () => {
    const user = userEvent.setup();
    render(<FleetParticipantsTable participants={mockParticipants} />);

    // Click pilot name header to sort ascending
    await user.click(screen.getByText("Pilot Name"));

    let rows = screen.getAllByRole("row");
    // Skip header, check first data row
    let firstRowCells = rows[1].querySelectorAll("td");
    expect(firstRowCells[0]).toHaveTextContent("Pilot Alpha");

    let secondRowCells = rows[2].querySelectorAll("td");
    expect(secondRowCells[0]).toHaveTextContent("Pilot Beta");

    let thirdRowCells = rows[3].querySelectorAll("td");
    expect(thirdRowCells[0]).toHaveTextContent("Pilot Gamma");

    // Click again for descending
    await user.click(screen.getByText("Pilot Name"));

    rows = screen.getAllByRole("row");
    firstRowCells = rows[1].querySelectorAll("td");
    expect(firstRowCells[0]).toHaveTextContent("Pilot Gamma");

    secondRowCells = rows[2].querySelectorAll("td");
    expect(secondRowCells[0]).toHaveTextContent("Pilot Beta");

    thirdRowCells = rows[3].querySelectorAll("td");
    expect(thirdRowCells[0]).toHaveTextContent("Pilot Alpha");
  });

  it("sorts by ship type when clicked", async () => {
    const user = userEvent.setup();
    render(<FleetParticipantsTable participants={mockParticipants} />);

    // Click ship type header to sort ascending
    await user.click(screen.getByText("Ship Type"));

    const rows = screen.getAllByRole("row");
    // Skip header, check order: Hurricane, Tempest, Typhoon
    const firstRowCells = rows[1].querySelectorAll("td");
    expect(firstRowCells[1]).toHaveTextContent("Hurricane");

    const secondRowCells = rows[2].querySelectorAll("td");
    expect(secondRowCells[1]).toHaveTextContent("Tempest");

    const thirdRowCells = rows[3].querySelectorAll("td");
    expect(thirdRowCells[1]).toHaveTextContent("Typhoon");
  });

  it("shows tooltips with raw numbers on hover", () => {
    render(<FleetParticipantsTable participants={mockParticipants} />);

    // Find spans with title attributes containing raw numbers
    const damageSpans = screen.getAllByTitle(/\(raw: \d+\)/);

    // Should have damage dealt, taken, reps given, taken for each pilot: 3 pilots * 4 = 12
    expect(damageSpans).toHaveLength(12);

    // Check a specific one
    const alphaDamageDealt = screen.getByTitle("(raw: 1200000000)");
    expect(alphaDamageDealt).toHaveTextContent("1.2B");
  });
});
