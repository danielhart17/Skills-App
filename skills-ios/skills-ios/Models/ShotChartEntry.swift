//
//  ShotChartEntry.swift
//  skills-ios
//
//  Created by Admin on 9/15/26.
//
import Foundation

struct ShotChartEntry: Codable, Identifiable {
    var id = UUID()
    let x: Double
    let y: Double
    let zone: String      // "paint" | "three" | "mid"
    let type: String      // "make" | "miss"
    let shot_kind: String // "2pt" | "3pt"

    enum CodingKeys: String, CodingKey {
        case x, y, zone, type, shot_kind
    }
}
