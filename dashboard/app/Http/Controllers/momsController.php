<?php

namespace App\Http\Controllers;

use App\Models\Moms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use function Pest\Laravel\json;

class momsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('moms/index', [
            'moms' => Moms::with('client')
                ->get()
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }


    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'ai_summary' => 'required|string|max:255',
            'requirements' => 'required|string|max:255',
            'requirement_summary' => 'required|string|max:255',
            'notes' => 'required|string|max:255',
            'suggestions' => 'required|string|max:255',
            'status' => 'required|in:new,followed-up,in-progress,completed'
        ]);
        $moms = Moms::create([
            'client_id' => $request->client_id,
            'ai_summary' => $request->ai_summary,
            'requirements' => $request->requirements,
            'requirement_summary' => $request->requirement_summary,
            'notes' => $request->notes,
            'suggestions' => $request->suggestions,
            'status' => $request->status
        ]);
        return response()->json([
            'message' => "MOMs created successfully.",
            'moms' => $moms
        ])->setStatusCode(201);
    }

    public function updateStatus(Request $request): RedirectResponse
    {
        $request->validate([
            'id' => 'required|integer|exists:moms,id',
            'status' => 'required|in:new,followed-up,in-progress,completed'
        ]);

        $moms = Moms::find($request->id);
        if (!$moms) {
            return to_route('moms.index')->with('error', 'MOMs not found.');
        }

        $moms->status = $request->status;
        $moms->save();

        // Redirect back to the same page with flash message
        return back()->with('success', 'MOMs status updated successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
